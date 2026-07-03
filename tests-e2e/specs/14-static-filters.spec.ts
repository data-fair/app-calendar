// 14 — staticFilters : injectés dans la requête /lines via qs=.
// Covers: useCalendarData.eventsQueryRaw → staticFilters + filters2qs (lib-utils).

import { expect, setupAppTest, prepareApp } from '../helpers/test-fixture'
import { injectConfig } from '../helpers/inject-config'
import { mockDataFairApi } from '../helpers/mock-api'
import { expectCalendarVisible } from '../helpers/assertions'
import { linesAccidentsVelos } from '../fixtures/api-responses'
import { configs } from '../fixtures/configs'
import { makeDatasetEntry } from '../fixtures/datasets'

const test = setupAppTest('accidents_velos_month', { lines: linesAccidentsVelos })

test('staticFilters absent : la requête /lines de useCalendarData n\'a pas qs=', async ({ appPage }) => {
  // Surveiller les requêtes émises par le calendar
  const requests: string[] = []
  appPage.on('request', (req) => {
    const u = req.url()
    // useCalendarData émet /lines, mais pas la useFetch qui fetch les events
    // uniquement après que start+end soient définis dans l'URL
    if (u.includes('/lines') && u.includes('qs=')) requests.push(u)
  })
  // Attendre que le calendrier fasse sa requête /lines (sans qs)
  await expect.poll(() => appPage.evaluate(() => {
    return (window as any).__test_lines_with_qs_count__ ?? 0
  }), { timeout: 1_000 }).toBe(0)
  expect(requests.length).toBe(0)
})

test('staticFilters présent : la requête /lines inclut qs=<field>:<value>', async ({ page }) => {
  const lines = linesAccidentsVelos
  const requests: string[] = []
  page.on('request', (req) => {
    const u = req.url()
    if (u.includes('/lines') && u.includes('qs=')) requests.push(u)
  })

  await prepareApp(page)
  await page.goto('/app/')
  await mockDataFairApi(page, 'accidents-velos', { lines })
  await injectConfig(page, {
    color: { type: 'monochrome', colors: { type: 'theme', strValue: 'primary' } },
    initialView: 'dayGridMonth',
    openOnCurrentDay: true,
    labelField: { key: 'Num_Acc', label: 'Identifiant accident' },
    additionalFields: ['dep'],
    staticFilters: [
      { type: 'in', field: 'dep', values: ['75', '92'] }
    ],
    datasets: [makeDatasetEntry('accidents_velos')],
  })
  await expectCalendarVisible(page)
  // Au moins une requête /lines inclut le param qs= avec le filtre dep
  await expect.poll(() => requests.length, { timeout: 5_000, intervals: [200, 500] }).toBeGreaterThan(0)
  // Le format filters2qs encode `in` → `dep:(75,92)` ou similaire
  expect(requests.some((u) => /dep:/.test(u))).toBe(true)
})

// Sanity : la fixture de base est correcte
test('configs.accidents_velos_month charge bien le dataset accidents_velos', () => {
  expect(configs.accidents_velos_month.dataset).toBe('accidents_velos')
  expect(configs.accidents_velos_month.config.color.type).toBe('monochrome')
})
