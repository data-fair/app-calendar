// tests/e2e/fixtures.ts — shared base of the e2e suite: console guard, session and site
// mocks, injection of window.APPLICATION. Specs import `test` and `expect` from here,
// never from '@playwright/test', so that the console guard applies to every test.
// App-specific mocks (dataset routes, configurations) go below this base, in the same file.
import { test as base, expect, type Page } from '@playwright/test'

export const test = base.extend<{ consoleGuard: void, expectedConsole: string[] }>({
  // messages a test provokes on purpose (a failing request), named one by one:
  //   test.use({ expectedConsole: ['status of 500'] })
  // substrings, not RegExp: fixture options are serialized and a RegExp would not survive
  expectedConsole: [[], { option: true }],
  consoleGuard: [async ({ page, expectedConsole }, use) => {
    const messages: string[] = []
    page.on('console', (msg) => {
      if (msg.type() !== 'error' && msg.type() !== 'warning') return
      if (expectedConsole.some(text => msg.text().includes(text))) return
      messages.push(`[${msg.type()}] ${msg.text()}`)
    })
    page.on('pageerror', (err) => {
      // harness artifact: Vite serves index.html raw, the inline `window.APPLICATION=%APPLICATION%`
      // fails to parse and setupMocks has already defined window.APPLICATION
      if (err.message === "Unexpected token '%'") return
      messages.push(`[pageerror] ${err.message}`)
    })
    await use()
    expect(messages, 'console must stay clean').toEqual([])
  }, { auto: true }]
})
export { expect }
export type { Page }

// the dark variant is offered, so `colorScheme: 'dark'` resolves to it like on a real site
// (colors of the default theme of @data-fair/lib-common-types/theme)
const darkColors = {
  background: '#303030',
  'on-background': '#FFFFFF',
  surface: '#424242',
  'on-surface': '#FFFFFF',
  primary: '#1976D2',
  'on-primary': '#FFFFFF',
  error: '#D50000',
  'on-error': '#FFFFFF'
}
export const mockSite = {
  _id: 'test-site',
  type: 'site',
  name: 'Test site',
  url: 'http://mock.test',
  owner: { type: 'organization', id: 'test-org', department: '' },
  settings: { defaultLocale: 'fr-FR' },
  theme: { colors: {}, dark: true, darkColors }
}

export function buildApplication (configuration: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'test-app',
    slug: 'test-app',
    title: 'Test app',
    // same origin as the page: App.vue posts configuration errors to href + '/error'
    href: '/data-fair/api/v1/applications/test-app',
    exposedUrl: 'http://mock.test/data-fair/app/test-app',
    apiUrl: '/data-fair/api/v1',
    wsUrl: 'ws://mock.test/data-fair',
    owner: { type: 'organization', id: 'test-org', department: '' },
    configuration
  }
}

export async function setupMocks (page: Page, application: Record<string, unknown>): Promise<void> {
  await page.route('**/simple-directory/**', (route) => {
    const url = route.request().url()
    // executable JS, not JSON: otherwise the global stays empty and the session silently
    // falls back to the deprecated refreshSiteInfo fetch
    if (url.endsWith('/_public.js')) {
      return route.fulfill({ contentType: 'application/javascript', body: `window.__PUBLIC_SITE_INFO = ${JSON.stringify(mockSite)}` })
    }
    // a system font instead of the site font (!important like the real _theme.css, which
    // overrides the default of global.scss): screenshots do not depend on a webfont download
    if (url.endsWith('.css')) return route.fulfill({ contentType: 'text/css', body: ':root { --d-body-font-family: sans-serif !important; --d-heading-font-family: sans-serif !important; }' })
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockSite) })
  })
  await page.route('**/data-fair/api/v1/applications/**', route => route.fulfill({ json: {} }))

  // defined before any script of the page; `writable: false` makes the inline assignment
  // of index.html unable to overwrite it
  await page.addInitScript((app) => {
    Object.defineProperty(window, 'APPLICATION', { configurable: true, enumerable: true, writable: false, value: app })
  }, application)
}

export async function gotoApp (page: Page, query = ''): Promise<void> {
  await page.goto('/app/' + query)
  await page.locator('#app .v-main').waitFor()
}

// ── calendar specific ──────────────────────────────────────────────────────────

// every date of the suite derives from this instant (a Wednesday): results and
// screenshots do not move with the day the suite runs
export const NOW = '2026-10-07T10:00:00+02:00'

const LABEL = 'http://www.w3.org/2000/01/rdf-schema#label'
const START = 'https://schema.org/startDate'
const END = 'https://schema.org/endDate'
const ALL_PERMISSIONS = ['readLines', 'createLine', 'updateLine', 'patchLine', 'deleteLine']

export type Line = Record<string, unknown> & { _id: string }
export type Dataset = { id: string, href: string, title: string, finalizedAt: string, schema: Record<string, unknown>[], isRest?: boolean, userPermissions?: string[] }

function dataset (id: string, schema: Record<string, unknown>[], admin = false): Dataset {
  return {
    id,
    href: `/data-fair/api/v1/datasets/${id}`,
    title: id,
    finalizedAt: '2026-01-01T00:00:00.000Z',
    schema,
    ...(admin ? { isRest: true, userPermissions: ALL_PERMISSIONS } : {})
  }
}

const jepSchema = [
  { key: 'title_fr', type: 'string', title: 'Titre', 'x-refersTo': LABEL },
  { key: 'firstdate_begin', type: 'string', format: 'date-time', title: 'Début', 'x-refersTo': START },
  { key: 'lastdate_end', type: 'string', format: 'date-time', title: 'Fin', 'x-refersTo': END },
  { key: 'location_city', type: 'string', title: 'Commune', 'x-refersTo': 'http://schema.org/City' },
  { key: '_id', type: 'string', title: 'Identifiant' }
]
const openingSchema = [
  { key: 'title', type: 'string', title: 'Titre', 'x-refersTo': LABEL },
  { key: 'start', type: 'string', format: 'date-time', title: 'Début', 'x-refersTo': START },
  { key: 'end', type: 'string', format: 'date-time', title: 'Fin', 'x-refersTo': END },
  { key: 'hours', type: 'string', title: 'Horaires', 'x-refersTo': 'https://schema.org/openingHours' },
  { key: '_id', type: 'string', title: 'Identifiant' }
]

export const datasets = {
  // simple layout: read only
  jep: dataset('jep', jepSchema),
  // admin layout: REST dataset + every line permission
  jepAdmin: dataset('jep-admin', jepSchema, true),
  opening: dataset('opening', openingSchema),
  openingAdmin: dataset('opening-admin', openingSchema, true)
}

export const jepConfig = {
  color: { type: 'monochrome', colors: { type: 'theme', strValue: 'primary' } },
  initialView: 'dayGridMonth',
  openOnCurrentDay: true,
  labelField: { key: 'title_fr', label: 'Titre' },
  additionalFields: ['location_city']
}
export const openingConfig = { ...jepConfig, labelField: { key: 'title', label: 'Titre' }, additionalFields: [] }

const jep = (id: string, title: string, start: string, end: string, city: string): Line =>
  ({ _id: id, title_fr: title, firstdate_begin: start, lastdate_end: end, location_city: city })

// around NOW: the current week holds timed and multi-day events, the month a few more
export const jepLines: Line[] = [
  jep('jep-1', 'Exposition photo', '2026-10-05T10:00:00+02:00', '2026-10-05T18:00:00+02:00', 'Marseille'),
  jep('jep-2', 'Visite du musée', '2026-10-07T09:00:00+02:00', '2026-10-07T12:00:00+02:00', 'Paris'),
  jep('jep-3', 'Conférence patrimoine', '2026-10-08T14:00:00+02:00', '2026-10-09T17:00:00+02:00', 'Lyon'),
  jep('jep-4', 'Atelier enfants', '2026-10-15T10:00:00+02:00', '2026-10-15T12:00:00+02:00', 'Bordeaux'),
  jep('jep-5', 'Concert du soir', '2026-10-22T20:00:00+02:00', '2026-10-22T22:00:00+02:00', 'Toulouse')
]

type LinesMock = Line[] | Line[][] | { status: number }

/**
 * Mock the dataset API. `lines` is one page, an array of pages (each page but the
 * last carries a `next` link, like data-fair), or an error status.
 */
export async function mockDataset (page: Page, ds: Dataset, lines: LinesMock = []): Promise<void> {
  const pages = 'status' in lines ? [] : (Array.isArray(lines[0]) ? lines as Line[][] : [lines as Line[]])
  await page.route(`**${ds.href}/**`, (route) => {
    const url = new URL(route.request().url())
    if (route.request().method() !== 'GET') return route.fulfill({ json: {} })
    if (url.pathname.endsWith('/lines')) {
      if ('status' in lines) return route.fulfill({ status: lines.status, json: { error: 'mocked error' } })
      const id = url.searchParams.get('_id_eq')
      if (id) return route.fulfill({ json: { total: 1, results: pages.flat().filter(l => l._id === id) } })
      const index = Number(url.searchParams.get('page') ?? 1) - 1
      // like data-fair, the next link keeps the query of the current page
      url.searchParams.set('page', String(index + 2))
      const next = index + 1 < pages.length ? url.href : null
      return route.fulfill({ json: { total: pages.flat().length, results: pages[index] ?? [], next } })
    }
    if (url.pathname.endsWith('/safe-schema')) {
      const properties = Object.fromEntries(ds.schema.filter(f => f.key !== '_id').map(({ key, ...f }) => [key, f]))
      return route.fulfill({ contentType: 'application/schema+json', body: JSON.stringify({ type: 'object', properties }) })
    }
    return route.fulfill({ status: 404, json: {} })
  })
}

/** Mock everything, freeze the clock at NOW and open the app. */
export async function openApp (page: Page, opts: { config?: Record<string, unknown>, dataset?: Dataset, lines?: LinesMock, query?: string } = {}): Promise<void> {
  const ds = opts.dataset ?? datasets.jep
  const configuration = opts.config ?? { ...jepConfig, datasets: [ds] }
  // install, not setFixedTime: Vue's event invoker drops an event whose timestamp is not
  // after the attachment of the listener (Date.now() on both sides), so with a frozen Date
  // the parent handlers of a bubbling event never run (the calendar drag breaks)
  await page.clock.install({ time: NOW })
  await setupMocks(page, buildApplication(configuration))
  await mockDataset(page, ds, opts.lines ?? jepLines)
  await gotoApp(page, opts.query)
}
