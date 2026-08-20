// 17 — Mode draft : un changement de configuration via postMessage('set-config')
// doit re-déclencher la réactivité (ici, le chargement de la palette multicolor)
// sans recharger la page.
// Covers: config.ts listener set-config → useCalendarData.colorPalette / categoriesData.

import { test, expect, prepareApp } from '../helpers/test-fixture'
import { injectConfig } from '../helpers/inject-config'
import { mockDataFairApi } from '../helpers/mock-api'
import { expectCalendarVisible } from '../helpers/assertions'
import { linesAccidentsVelos, valuesAccidentsAgg } from '../fixtures/api-responses'
import { makeDatasetEntry } from '../fixtures/datasets'

const baseConfig = {
  color: { type: 'monochrome', colors: { type: 'theme', strValue: 'primary' } },
  initialView: 'dayGridMonth',
  openOnCurrentDay: true,
  labelField: { key: 'Num_Acc', label: 'Identifiant accident' },
  additionalFields: ['dep'],
}

test('changer la config en draft (set-config) relance la requête multicolor /values', async ({ page }) => {
  await prepareApp(page)
  await page.goto('/app/')
  await mockDataFairApi(page, 'accidents-velos', { lines: linesAccidentsVelos, values: valuesAccidentsAgg })
  await injectConfig(page, { ...baseConfig, datasets: [makeDatasetEntry('accidents_velos')] })
  await expectCalendarVisible(page)

  const requests: string[] = []
  page.on('request', (req) => { if (req.url().includes('/values/agg')) requests.push(req.url()) })

  // Passage en multicolor via postMessage (mode draft) → doit déclencher GET /values/agg
  await page.evaluate((cfg) => {
    window.postMessage({ type: 'set-config', content: { configuration: cfg } }, '*')
  }, {
    ...baseConfig,
    color: { type: 'multicolor', field: 'agg', colors: { type: 'palette', name: 'Spectral', offset: 0 } },
    datasets: [makeDatasetEntry('accidents_velos')],
  })

  await expect.poll(() => requests.length, { timeout: 8_000, intervals: [200] }).toBeGreaterThan(0)
})
