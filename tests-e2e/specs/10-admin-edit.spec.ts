// 10 — Admin : édition d'un événement (clic edit → form VJSF).
// Covers: EventDetails.vue mode='edit' → EventEdit.vue → saveEvent() useAsyncAction → PUT /lines/:id.

import { expect, setupAppTest } from '../helpers/test-fixture'
import { expectCalendarVisible } from '../helpers/assertions'
import { linesJepAdmin, linesJepAdminSingle, safeSchemaJep } from '../fixtures/api-responses'

const test = setupAppTest('jep_admin_week', {
  lines: linesJepAdmin,
  singleLine: linesJepAdminSingle,
  safeSchema: safeSchemaJep,
})

test('clic sur un événement : ouvre la modale avec 3 boutons d\'action', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  const firstEvent = appPage.locator('[data-event-id]').first()
  await expect(firstEvent).toBeVisible({ timeout: 10_000 })
  await firstEvent.click()
  await expect(appPage.locator('.v-menu .v-card').first()).toBeVisible({ timeout: 5_000 })
  // 3 boutons d'action dans .v-card-actions (header)
  const actions = appPage.locator('.v-menu .v-card .v-card-actions').first()
  const buttons = actions.locator('button')
  await expect(buttons).toHaveCount(3, { timeout: 5_000 })
})

test('clic sur Modifier (premier bouton action) : passe en mode édition (toolbar devient disabled)', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  const firstEvent = appPage.locator('[data-event-id]').first()
  await expect(firstEvent).toBeVisible({ timeout: 10_000 })
  await firstEvent.click()
  await appPage.locator('.v-menu .v-card').first().waitFor({ state: 'visible' })
  // Premier bouton d'action = Modifier (pencil) → passe en mode edit
  const actions = appPage.locator('.v-menu .v-card .v-card-actions').first()
  await actions.locator('button').nth(0).click()
  // En mode edit, editMode=true → toolbar buttons disabled (date picker, prev/next, vues)
  await expect(appPage.locator('.v-toolbar button[disabled]').first())
    .toBeVisible({ timeout: 10_000 })
})
