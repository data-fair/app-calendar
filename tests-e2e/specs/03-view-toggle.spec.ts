// 03 — Toggle entre les vues Mois/Semaine/Jour/Planning + persistance dans l'URL.
// Covers: Calendar.vue `type` ref + reactiveSearchParams.view, vuetifyType (planning -> month).

import { expect, setupAppTest } from '../helpers/test-fixture'
import { expectCalendarVisible } from '../helpers/assertions'
import { linesAccidentsVelos, linesJepPlanning } from '../fixtures/api-responses'
import { getSearchParam } from '../helpers/assertions'

const testMonth = setupAppTest('accidents_velos_month', { lines: linesAccidentsVelos })

testMonth('clic sur "Semaine" : passe en vue week ET écrit view=week dans l\'URL', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  await appPage.locator('.view-type-toggle').locator('text=Semaine').click()
  // L'URL doit contenir view=week
  await expect.poll(async () => getSearchParam(appPage, 'view')).toBe('week')
})

testMonth('clic sur "Jour" : passe en vue day ET écrit view=day dans l\'URL', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  await appPage.locator('.view-type-toggle').locator('text=Jour').click()
  await expect.poll(async () => getSearchParam(appPage, 'view')).toBe('day')
})

const testPlanning = setupAppTest('jep_planning', { linesPaginated: linesJepPlanning })

testPlanning('initialView=planning : affiche la liste d\'événements à venir', async ({ appPage }) => {
  // Initial view is "planning" → pas de <v-calendar> mais une liste de planning-event-row
  await expect(appPage.locator('.planning-day-header').first()).toBeVisible({ timeout: 10_000 })
})

testPlanning('clic sur "Mois" depuis Planning : revient en vue Mois + URL view=month', async ({ appPage }) => {
  await appPage.locator('.planning-day-header').first().waitFor({ state: 'visible' })
  await appPage.locator('.view-type-toggle').locator('text=Mois').click()
  await expectCalendarVisible(appPage)
  await expect.poll(async () => getSearchParam(appPage, 'view')).toBe('month')
})

const testInitialWeek = setupAppTest('accidents_velos_week', { lines: linesAccidentsVelos })

testInitialWeek('initialView=timeGridWeek démarre directement en vue Semaine', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  // Bouton "Semaine" actif dans le toggle (preuve du type=week au démarrage)
  await expect(appPage.locator('.view-type-toggle .view-type-active').first())
    .toContainText('Semaine', { timeout: 10_000 })
})
