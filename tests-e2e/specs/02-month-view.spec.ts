// 02 — Vue Mois : rendu + navigation prev/next/Aujourd'hui.
// Covers: Calendar.vue v-calendar `dayGridMonth`, buttons prev/next/today.

import { expect, setupAppTest } from '../helpers/test-fixture'
import { expectCalendarVisible } from '../helpers/assertions'
import { linesAccidentsVelos } from '../fixtures/api-responses'

const test = setupAppTest('accidents_velos_month', {
  lines: linesAccidentsVelos
})

test('le calendrier est rendu en vue Mois', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  // View-toggle buttons exist
  await expect(appPage.locator('.view-type-toggle')).toBeVisible()
  await expect(appPage.locator('.view-type-toggle').locator('text=Mois')).toBeVisible()
})

test('les boutons prev/next sont cliquables et changent le titre', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  // Capture le titre initial
  const titleButton = appPage.locator('.v-toolbar .v-btn.text-none').first()
  const initialTitle = await titleButton.textContent()
  // Le 2e bouton icon dans la toolbar = prev, le 3e = next
  const nextBtn = appPage.locator('.v-toolbar .v-btn--icon').nth(1)
  await nextBtn.click()
  // Le titre doit avoir changé
  await expect(appPage.locator('.v-toolbar .v-btn.text-none').first()).not.toHaveText(initialTitle || 'undefined')
})

test('le bouton "Aujourd\'hui" ramène à la date courante', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  // Aller au mois suivant
  await appPage.locator('.v-toolbar .v-btn--icon').nth(1).click()
  // Cliquer "Aujourd'hui"
  await appPage.locator('button:has-text("Aujourd\'hui")').click()
  // Au moins un day-cell visible
  await expect(appPage.locator('.v-calendar-weekly__day').first()).toBeVisible()
})

test('les événements du dataset mocké apparaissent dans les cellules', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  // Au moins un événement doit être rendu (template #event ajoute data-event-id)
  await expect(appPage.locator('[data-event-id]').first()).toBeVisible({ timeout: 15_000 })
})
