// Helpers to mock DataFair API endpoints via Playwright route interception.
// We intercept all calls matching the dataset API base path and return
// fixtures from ../fixtures/api-responses.ts. This makes tests fast and
// deterministic, with no dependency on the live koumoul.com service.
import type { Page, Route } from '@playwright/test'
import * as api from '../fixtures/api-responses'

// Per-test registry of which fixture to return for which URL pattern.
// Tests register fixtures with mockDataFairApi() before sending the config.
export interface MockMap {
  lines?: any // fixture for /lines (single page) and pagination (multi-page)
  linesPaginated?: any // fixture for the first /lines call (with `next` URL); defaults return empty
  values?: any // fixture for /values/<field>
  safeSchema?: any // fixture for /safe-schema (used by EventEdit form)
  singleLine?: any // fixture for /lines?_id_eq=...
  // Behavior modifiers
  linesErrors?: boolean // if true, return 500 for /lines
}

const DATASET_PATH_RE = /\/api\/v1\/datasets\/([^/]+)\//

/**
 * Mock all DataFair API endpoints for a given dataset.
 * `mocks` defines what each endpoint returns; defaults to empty results.
 */
export async function mockDataFairApi (page: Page, datasetId: string, mocks: MockMap = {}) {
  await page.route(`**/api/v1/datasets/${datasetId}/**`, async (route: Route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const method = route.request().method()

    // POST/PUT/DELETE /lines (admin CRUD): let the request go through if no
    // explicit mock — by default respond with 200 so the test does not hang.
    if (method !== 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true })
      })
    }

    // /lines (paginated)
    if (path.endsWith('/lines') || path.includes('/lines?')) {
      if (mocks.linesErrors) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'mocked error' })
        })
      }
      // Single-event (filter by _id_eq) takes priority
      if (url.search.includes('_id_eq=') && mocks.singleLine) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mocks.singleLine)
        })
      }
      // First page with next pointer → returns both the paginated body if present
      if (mocks.linesPaginated && (url.search.includes('_c_date_match=now/d') || url.search.includes('_c_date_match=' + url.searchParams.get('start') + ','))) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mocks.linesPaginated)
        })
      }
      const body = mocks.lines || api.linesAccidentsVelos
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body)
      })
    }

    // /lines/<id>
    const lineIdMatch = path.match(/\/lines\/[^/?]+$/)
    if (lineIdMatch) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(api.linesSingleEvent)
      })
    }

    // /values/<field>
    const valuesMatch = path.match(/\/values\/([^/?]+)/)
    if (valuesMatch && !path.includes('values-labels')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mocks.values || api.valuesAccidentsAgg)
      })
    }

    // /safe-schema?... (EventEdit form)
    if (path.includes('/safe-schema')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/schema+json',
        body: JSON.stringify(mocks.safeSchema || api.safeSchemaAccidents)
      })
    }

    // /schema (used by config-form getItems; we don't need it)
    if (path.endsWith('/schema') || path.includes('/schema?')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]'
      })
    }

    // /attachments/<file> (used in Actions.vue)
    if (path.includes('/attachments/')) {
      return route.fulfill({ status: 200, contentType: 'text/plain', body: '' })
    }

    // Catch-all: 404
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
  })
}

// Mocks the /simple-directory endpoints used by createSession() in main.ts.
// The session module calls /simple-directory/api/sites/_public to fetch the
// site info (used by vuetifySessionOptions). The keepalive endpoint is only
// hit when an id_token cookie is present, which is never the case in tests.
//
// The site info shape is the minimum required by lib-vue's getSession() and
// lib-vuetify's vuetifySessionOptions(): a plain object with an empty `theme`
// so that session.site.value is set and colors fall back to the defaults.
export async function mockSimpleDirectory (page: Page) {
  await page.route('**/simple-directory/api/sites/_public', async (route: Route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ theme: { colors: {} } })
    })
  })
}
