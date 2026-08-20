// 16 — Horaires d'ouverture : l'éditeur de créneaux s'affiche en mode édition.
// Covers: EventEdit.vue (VJSF node 'opening-hours') → OpeningHoursNode.vue → OpeningHours.vue.

import { expect, setupAppTest } from '../helpers/test-fixture'
import { expectCalendarVisible } from '../helpers/assertions'
import { linesEventsOpening, linesEventsOpeningSingle, safeSchemaOpening } from '../fixtures/api-responses'

const test = setupAppTest('events_opening_admin', {
  lines: linesEventsOpening,
  singleLine: linesEventsOpeningSingle,
  safeSchema: safeSchemaOpening,
})

test('mode édition d\'un événement avec horaires : l\'éditeur de créneaux est rendu', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  const firstEvent = appPage.locator('[data-event-id]').first()
  await expect(firstEvent).toBeVisible({ timeout: 10_000 })
  await firstEvent.click()
  await appPage.locator('.v-menu .v-card').first().waitFor({ state: 'visible' })
  // Clic sur Modifier (1er bouton d'action du header)
  const actions = appPage.locator('.v-menu .v-card .v-card-actions').first()
  await actions.locator('button').nth(0).click()
  // L'éditeur OpeningHours.vue rend les jours de la semaine
  await expect(appPage.locator('.v-menu').locator('text=Lundi').first()).toBeVisible({ timeout: 8_000 })
  await expect(appPage.locator('.v-menu').locator('text=Dimanche').first()).toBeVisible({ timeout: 5_000 })
})
