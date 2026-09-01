// 09 — Admin : modale événement avec boutons admin.
// Covers: EventDetails.vue mode='read' (admin) → 3 boutons d'action (Modifier/Supprimer/Fermer).

import { expect, setupAppTest } from '../helpers/test-fixture'
import { expectCalendarVisible } from '../helpers/assertions'
import { linesJepAdmin, linesJepAdminSingle } from '../fixtures/api-responses'

const test = setupAppTest('jep_admin_week', {
  lines: linesJepAdmin,
  singleLine: linesJepAdminSingle,
})

test('clic sur un événement : ouvre la modale avec 3 boutons d\'action (Modifier/Supprimer/Fermer)', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  // Clic sur un événement existant → ouvre modale avec boutons admin
  const firstEvent = appPage.locator('[data-event-id]').first()
  await expect(firstEvent).toBeVisible({ timeout: 10_000 })
  await firstEvent.click()
  await expect(appPage.locator('.v-menu .v-card').first()).toBeVisible({ timeout: 5_000 })
  // En mode admin, la carte ouvre avec `.v-card-actions` contenant 3 boutons :
  // index 0 = Modifier (pencil), 1 = DeleteEvent (activator), 2 = Fermer (close)
  const actions = appPage.locator('.v-menu .v-card .v-card-actions').first()
  const buttons = actions.locator('button')
  await expect(buttons).toHaveCount(3, { timeout: 5_000 })
  await expect(buttons.nth(0)).toBeEnabled() // Modifier
  await expect(buttons.nth(1)).toBeEnabled() // Supprimer
  await expect(buttons.nth(2)).toBeEnabled() // Fermer
})

test('layout admin : la modale reste en read mode (pas de form VJSF)', async ({ appPage }) => {
  // En read mode + linkField/attachmentField présent (JEP), la modale a 2 v-card-actions :
  // 1. header (3 boutons : Modifier/Supprimer/Fermer)
  // 2. footer Actions.vue (Page associée, conditionnelle)
  // Le form VJSF (3e v-card-actions Annuler/Valider) n'est PAS rendu.
  await expectCalendarVisible(appPage)
  const firstEvent = appPage.locator('[data-event-id]').first()
  await expect(firstEvent).toBeVisible({ timeout: 10_000 })
  await firstEvent.click()
  await expect(appPage.locator('.v-menu .v-card').first()).toBeVisible({ timeout: 5_000 })
  // 3 boutons dans la 1re v-card-actions (header)
  const headerActions = appPage.locator('.v-menu .v-card .v-card-actions').first()
  await expect(headerActions.locator('button')).toHaveCount(3, { timeout: 5_000 })
  // Pas de bouton "Valider" (preuve que le form edit n'est pas rendu)
  await expect(appPage.locator('.v-menu button:has-text("Valider")')).toHaveCount(0)
})
