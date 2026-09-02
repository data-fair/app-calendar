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
  // Mousedown au centre (zone « move », hors zones de resize de 8px) puis
  // mousemove de 80px horizontal + 20px vertical. La composante verticale est
  // indispensable : hasDragged n'est posé que si la minute mappée change
  // (useDragResize.applyDrag) — un déplacement purement horizontal reste dans
  // la même colonne jour (≈172px de large) et ne déclenche jamais finalizeDrag.
  // On termine dans l'événement (~72px de haut, l'aperçu suit le drag) pour que
  // le click résiduel du mouseup soit avalé par justDragged (onClickEvent) et
  // n'ouvre pas le menu de création via onClickDate.
  await appPage.mouse.move(box.x + box.width / 2, box.y + 20)
  await appPage.mouse.down()
  await appPage.mouse.move(box.x + box.width / 2 + 80, box.y + 40, { steps: 8 })
  await appPage.mouse.up()

  // finalizeDrag doit ouvrir la modale d'édition (forceEdit=true)
  await expect(appPage.locator('.v-menu .v-card').first()).toBeVisible({ timeout: 10_000 })
  // En mode edit (forceEdit), 2 v-card-actions apparaissent (header réduit + form Annuler/Valider)
  await expect(appPage.locator('.v-menu .v-card .v-card-actions')).toHaveCount(2, { timeout: 20_000 })
})
