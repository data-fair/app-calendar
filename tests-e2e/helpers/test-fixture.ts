// Lightweight helper to set up a test for a specific config.
// Usage:
//   import { expect, setupAppTest } from '../helpers/test-fixture'
//   const test = setupAppTest('accidents_velos_month', { lines: ... })
//   test('renders', async ({ appPage }) => { ... })

import { test as base, expect as baseExpect, type Page } from '@playwright/test'
import { injectConfig } from './inject-config'
import { mockDataFairApi, mockSimpleDirectory, type MockMap } from './mock-api'
import { datasets, makeDatasetEntry, type DatasetKey } from '../fixtures/datasets'
import { configs, type ConfigName } from '../fixtures/configs'

export const test = base
export const expect = baseExpect

export interface AppPageFixture {
  appPage: Page
}

/**
 * Minimal stand-in for what df-dev-server normally injects via the
 * %APPLICATION% placeholder in index.html. Tests then override the
 * configuration via postMessage('set-config') — see helpers/inject-config.ts.
 *
 * Les URLs pointent l'origine du serveur e2e (E2E_PORT, généré par
 * df-dev-env) : App.vue poste ses erreurs de config sur href + '/error' ;
 * un port codé en dur d'une autre époque produisait des ERR_CONNECTION_REFUSED.
 */
const stubOrigin = `http://localhost:${process.env.E2E_PORT ?? 4100}`

export const stubApplication = {
  id: 'dev-application',
  slug: 'app-calendar',
  title: 'Dev calendar',
  owner: { type: 'user', id: 'dev', name: 'Dev' },
  configuration: {},
  exposedUrl: `${stubOrigin}/app`,
  href: `${stubOrigin}/config`,
  apiUrl: `${stubOrigin}/api/v1`,
  wsUrl: `ws://localhost:${process.env.E2E_PORT ?? 4100}/ws`,
  baseApp: { id: 'app-calendar', url: `${stubOrigin}/app`, meta: {} },
}

/**
 * Register the mocks + addInitScript that the test page needs in order to
 * fully boot the app without an external dev server. Call this BEFORE
 * page.goto(). Transverse tests (that don't use setupAppTest) can also
 * call it directly to share the same setup.
 */
export async function prepareApp (page: Page) {
  await page.addInitScript((app) => {
    ;(window as any).APPLICATION = app
  }, stubApplication)
  await mockSimpleDirectory(page)
}

/**
 * Set up a Playwright test for a specific config:
 * - Injects window.APPLICATION via addInitScript
 * - Mocks all DataFair API endpoints
 * - Loads /app/
 * - Sends the configuration via postMessage('set-config')
 * - Waits for the calendar to render
 */
export function setupAppTest (
  configName: ConfigName,
  mocks: MockMap = {}
) {
  const entry = configs[configName]
  const datasetKey = entry.dataset as DatasetKey
  const dataset = datasets[datasetKey]
  const fullConfig = { ...entry.config, datasets: [makeDatasetEntry(datasetKey)] }

  return base.extend<AppPageFixture>({
    appPage: async ({ page }, use) => {
      await prepareApp(page)
      await page.goto('/app/')
      await mockDataFairApi(page, dataset.id, mocks)
      await injectConfig(page, fullConfig)
      await use(page)
    }
  })
}
