// 11 — Admin : suppression d'un événement (DeleteEvent.vue → DELETE /lines/:id).
// Covers: DeleteEvent.vue useAsyncAction → DELETE /lines/:id.

import { expect, setupAppTest } from '../helpers/test-fixture'
import { expectCalendarVisible } from '../helpers/assertions'
import { linesJepAdmin, linesJepAdminSingle } from '../fixtures/api-responses'

const test = setupAppTest('jep_admin_week', {
  lines: linesJepAdmin,
  singleLine: linesJepAdminSingle,
})

test('clic sur Supprimer (2e bouton action) ouvre le menu de confirmation', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  const firstEvent = appPage.locator('[data-event-id]').first()
  await expect(firstEvent).toBeVisible({ timeout: 10_000 })
  await firstEvent.click()
  await appPage.locator('.v-menu .v-card').first().waitFor({ state: 'visible' })
  // 2e bouton action = DeleteEvent activator
  const actions = appPage.locator('.v-menu .v-card .v-card-actions').first()
  await actions.locator('button').nth(1).click()
  // Le menu de confirmation apparaît (DeleteEvent.vue a v-card "Supprimer l'événement ?")
  await expect(appPage.locator('text=Supprimer l\'événement').first()).toBeVisible({ timeout: 5_000 })
})

test('confirmation "Supprimer" envoie un DELETE /lines/:id', async ({ appPage }) => {
  const deletes: string[] = []
  appPage.on('request', (req) => {
    if (req.method() === 'DELETE' && req.url().includes('/lines/')) {
      deletes.push(req.url())
    }
  })
  await expectCalendarVisible(appPage)
  const firstEvent = appPage.locator('[data-event-id]').first()
  await expect(firstEvent).toBeVisible({ timeout: 10_000 })
  await firstEvent.click()
  await appPage.locator('.v-menu .v-card').first().waitFor({ state: 'visible' })
  // Ouvre le menu delete (2e bouton action)
  const actions = appPage.locator('.v-menu .v-card .v-card-actions').first()
  await actions.locator('button').nth(1).click()
  await appPage.locator('text=Supprimer l\'événement').first().waitFor({ state: 'visible', timeout: 5_000 })
  // Cliquer sur le bouton "Supprimer" de confirmation (le dernier "Supprimer" texte est dans le menu overlay)
  const deleteButtons = appPage.locator('button:has-text("Supprimer")')
  const count = await deleteButtons.count()
  await deleteButtons.nth(count - 1).click()
  await expect.poll(() => deletes.length, { timeout: 5_000 }).toBeGreaterThan(0)
})
