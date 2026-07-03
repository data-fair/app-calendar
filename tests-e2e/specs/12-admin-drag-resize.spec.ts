// 12 — Admin : drag d'un événement (move) → ouverture modale edit (forceEdit).
// Covers: useDragResize.onMouseDownEvent / finalizeDrag → EventDetails edit mode (forceEdit).

import { expect, setupAppTest } from '../helpers/test-fixture'
import { expectCalendarVisible } from '../helpers/assertions'
import { linesJepAdmin, linesJepAdminSingle, safeSchemaJep } from '../fixtures/api-responses'

const test = setupAppTest('jep_admin_week', {
  lines: linesJepAdmin,
  singleLine: linesJepAdminSingle,
  safeSchema: safeSchemaJep,
})

test('mousedown + mousemove + mouseup : ouvre la modale d\'édition (forceEdit)', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  const firstEvent = appPage.locator('[data-event-id]').first()
  await expect(firstEvent).toBeVisible({ timeout: 10_000 })
  const box = await firstEvent.boundingBox()
  if (!box) {
    test.skip()
    return
  }
  // Mousedown au centre → mousemove de 80px → mouseup
  await appPage.mouse.move(box.x + box.width / 2, box.y + 20)
  await appPage.mouse.down()
  await appPage.mouse.move(box.x + box.width / 2 + 80, box.y + 20, { steps: 8 })
  await appPage.mouse.up()

  // finalizeDrag doit ouvrir la modale d'édition (forceEdit=true)
  await expect(appPage.locator('.v-menu .v-card').first()).toBeVisible({ timeout: 10_000 })
  // En mode edit (forceEdit), 2 v-card-actions apparaissent (header réduit + form Annuler/Valider)
  await expect(appPage.locator('.v-menu .v-card .v-card-actions')).toHaveCount(2, { timeout: 20_000 })
})
