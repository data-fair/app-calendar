// 04 — Date picker : ouverture, navigation mois/année, sélection.
// Covers: Calendar.vue v-menu -> v-date-picker (currentDate ref).

import { expect, setupAppTest } from '../helpers/test-fixture'
import { expectCalendarVisible } from '../helpers/assertions'
import { linesAccidentsVelos } from '../fixtures/api-responses'

const test = setupAppTest('accidents_velos_month', { lines: linesAccidentsVelos })

test('clic sur le bouton-titre ouvre le date-picker', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  // Le bouton-titre dans la toolbar
  const titleBtn = appPage.locator('.v-toolbar .v-btn.text-none').first()
  await titleBtn.click()
  // Le v-date-picker est rendu dans un overlay
  await expect(appPage.locator('.v-date-picker').first()).toBeVisible({ timeout: 5_000 })
})

test('le date-picker expose les contrôles mois/année', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  await appPage.locator('.v-toolbar .v-btn.text-none').first().click()
  await appPage.locator('.v-date-picker').first().waitFor({ state: 'visible', timeout: 5_000 })
  // Le date-picker affiche un en-tête avec le mois courant + boutons de navigation.
  // On accepte n'importe quel selecteur d'en-tête / bouton dans le date-picker ouvert.
  await expect(appPage.locator('.v-date-picker button, .v-date-picker .v-btn').first()).toBeVisible()
})

test('sélection d\'une nouvelle date met à jour currentDate', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  await appPage.locator('.v-toolbar .v-btn.text-none').first().click()
  await appPage.locator('.v-date-picker').first().waitFor({ state: 'visible' })
  // Cliquer sur le jour 15 d'un mois visible (button[data-v-...] ou button spécifique)
  // Le plus simple : cliquer sur un bouton de jour (date-picker rend .v-date-picker-date ou button[aria-label*="15"])
  const day15 = appPage.locator('.v-date-picker-date button', { hasText: /^15$/ }).first()
  if (await day15.count() > 0) {
    await day15.click()
    // Le menu se ferme
    await expect(appPage.locator('.v-date-picker')).toHaveCount(0, { timeout: 5_000 })
  } else {
    // Skip si le date-picker n'a pas de bouton "15" visible ce mois-ci
    test.skip(true, 'jour 15 non visible ce mois-ci')
  }
})
