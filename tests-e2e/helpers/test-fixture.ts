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
 */
export const stubApplication = {
  id: 'dev-application',
  slug: 'app-calendar',
  title: 'Dev calendar',
  owner: { type: 'user', id: 'dev', name: 'Dev' },
  configuration: {},
  exposedUrl: 'http://localhost:4100/app',
  href: 'http://localhost:4100/config',
  apiUrl: 'http://localhost:4100/api/v1',
  wsUrl: 'ws://localhost:4100/ws',
  baseApp: { id: 'app-calendar', url: 'http://localhost:4100/app', meta: {} },
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
