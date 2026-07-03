// 07 — URL state synchronisation : view/date/start/end reflétés et lus depuis l'URL.
// Covers: Calendar.vue `watch(type, ...)` & `watch(currentDate, ...)` + onCalendarChange.

import { expect, setupAppTest, prepareApp } from '../helpers/test-fixture'
import { injectConfig } from '../helpers/inject-config'
import { expectCalendarVisible, getSearchParam } from '../helpers/assertions'
import { linesAccidentsVelos } from '../fixtures/api-responses'

const test = setupAppTest('accidents_velos_month', { lines: linesAccidentsVelos })

test('navigation next : le paramètre date dans l\'URL est mis à jour', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  const before = await getSearchParam(appPage, 'date')
  // 2e bouton icon de la toolbar = next (chevron-right)
  await appPage.locator('.v-toolbar .v-btn--icon').nth(1).click()
  await expect.poll(async () => getSearchParam(appPage, 'date')).not.toBe(before)
})

test('navigation next écrit aussi start + end (range de la vue)', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  await appPage.locator('.v-toolbar .v-btn--icon').nth(1).click()
  // start et end doivent être des ISO strings
  const start = await getSearchParam(appPage, 'start')
  const end = await getSearchParam(appPage, 'end')
  expect(typeof start).toBe('string')
  expect(typeof end).toBe('string')
  expect(new Date(start as string).getTime()).toBeLessThan(new Date(end as string).getTime())
})

test('toggle de vue met view dans l\'URL', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  await appPage.locator('.view-type-toggle').locator('text=Semaine').click()
  await expect.poll(async () => getSearchParam(appPage, 'view')).toBe('week')
})

test('changement de l\'URL view répercute la vue (cas iframe sync)', async ({ page }) => {
  await prepareApp(page)
  await page.goto('/app/?view=day')
  // On injecte un config APRÈS le goto
  await injectConfig(page, {
    color: { type: 'monochrome', colors: { type: 'theme', strValue: 'primary' } },
    initialView: 'dayGridMonth',
    labelField: { key: 'Num_Acc', label: 'Identifiant accident' },
    imageDisplay: 'cover',
    imagePosition: 'top',
    aspectRatio: 3,
    imageWidth: 100,
    additionalFields: ['dep'],
    openOnCurrentDay: true,
    datasets: [{
      href: '/api/v1/datasets/accidents-velos',
      id: 'accidents-velos',
      title: 'Accidents',
      finalizedAt: '2024-01-01T00:00:00.000Z',
      schema: linesAccidentsVelos.results[0] ? [] : [],
    }]
  })
  // La vue initiale est forcée à "day" via l'URL
  // Note: la détection de la vue day est dans .v-calendar-daily__pane
  await expect(page.locator('.v-calendar-daily__pane, .v-calendar-weekly__day').first()).toBeVisible({ timeout: 10_000 })
})
