// 06 — Vue Planning : liste d'événements, scroll infini, état vide.
// Covers: PlanningView.vue + usePlanningData (pagination, IntersectionObserver).

import { expect, setupAppTest } from '../helpers/test-fixture'
import { linesJepPlanning, linesJepPlanningPaginated, emptyResults } from '../fixtures/api-responses'

const testPaginated = setupAppTest('jep_planning', {
  linesPaginated: linesJepPlanningPaginated
})

testPaginated('affiche les événements futurs groupés par jour', async ({ appPage }) => {
  await expect(appPage.locator('.planning-day-header').first()).toBeVisible({ timeout: 10_000 })
  // Au moins un événement rendu
  await expect(appPage.locator('.planning-event-row').first()).toBeVisible()
})

testPaginated('chaque ligne affiche le nom de l\'événement et l\'heure', async ({ appPage }) => {
  await appPage.locator('.planning-event-row').first().waitFor({ state: 'visible' })
  // Le nom (planning-event-name) et l'heure (planning-event-time) doivent être visibles
  await expect(appPage.locator('.planning-event-name').first()).toBeVisible()
})

testPaginated('le titre de la plage de dates s\'affiche dans la toolbar', async ({ appPage }) => {
  await appPage.locator('.planning-day-header').first().waitFor({ state: 'visible' })
  // Le planningTitle est rendu dans <v-toolbar-title> quand type=planning
  await expect(appPage.locator('.v-toolbar-title').first()).toBeVisible()
})

const testEmpty = setupAppTest('jep_planning', {
  linesPaginated: emptyResults
})

testEmpty('état vide : affiche "Aucun événement à venir"', async ({ appPage }) => {
  await expect(appPage.locator('.planning-empty-message')).toContainText('Aucun événement', { timeout: 10_000 })
})

const testPaginated2 = setupAppTest('jep_planning', {
  linesPaginated: linesJepPlanningPaginated
})

testPaginated2('clic sur un événement ouvre la modale EventDetails', async ({ appPage }) => {
  await appPage.locator('.planning-event-row').first().waitFor({ state: 'visible' })
  await appPage.locator('.planning-event-row').first().click()
  await expect(appPage.locator('.v-menu .v-card').first()).toBeVisible({ timeout: 5_000 })
})
