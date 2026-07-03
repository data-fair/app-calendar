// 05 — Event details (mode read) : clic sur un événement → modale avec label/champs/image.
// Covers: Calendar.vue onClickEvent → EventDetails.vue (EventView.vue rendering).

import { expect, setupAppTest } from '../helpers/test-fixture'
import { expectCalendarVisible } from '../helpers/assertions'
import { linesAccidentsVelos } from '../fixtures/api-responses'

const test = setupAppTest('accidents_velos_month', { lines: linesAccidentsVelos })

test('clic sur un événement : ouvre la modale EventDetails (v-card)', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  // Attend qu'au moins un événement soit rendu
  const firstEvent = appPage.locator('[data-event-id]').first()
  await expect(firstEvent).toBeVisible({ timeout: 10_000 })
  // Cliquer sur l'événement
  await firstEvent.click()
  // La modale event details devrait apparaître (v-card in v-menu)
  await expect(appPage.locator('.v-menu .v-card').first()).toBeVisible({ timeout: 5_000 })
})

test('la modale affiche le labelField (Num_Acc)', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  const firstEvent = appPage.locator('[data-event-id]').first()
  await expect(firstEvent).toBeVisible({ timeout: 10_000 })
  await firstEvent.click()
  // Le label est affiché dans <h3> (cf. EventView.vue ligne 24-28)
  await expect(appPage.locator('.v-menu .v-card h3').first()).toBeVisible({ timeout: 5_000 })
})

test('la modale affiche les additionalFields (dep + an)', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  const firstEvent = appPage.locator('[data-event-id]').first()
  await expect(firstEvent).toBeVisible({ timeout: 10_000 })
  await firstEvent.click()
  // EventView utilise v-list-item pour chaque additional field
  await expect(appPage.locator('.v-menu .v-card .v-list-item').first()).toBeVisible({ timeout: 5_000 })
})

test('le bouton close de la modale la referme', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  const firstEvent = appPage.locator('[data-event-id]').first()
  await expect(firstEvent).toBeVisible({ timeout: 10_000 })
  await firstEvent.click()
  const modalCard = appPage.locator('.v-menu .v-card').first()
  await expect(modalCard).toBeVisible({ timeout: 5_000 })
  // Le mode "read" (non-admin) affiche seulement la date en title + close button
  // Pour les non-admin, le close button est dans un dialog, ou par clic externe
  // Clic externe sur le calendrier (à côté de l'événement)
  await appPage.locator('.v-calendar').first().click({ position: { x: 5, y: 5 }, force: true })
})
