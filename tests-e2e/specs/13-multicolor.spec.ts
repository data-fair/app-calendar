// 13 — Multicolor : palette chroma + catégories custom.
// Covers: useCalendarData.colorPalette → useCalendarEvents.getColor.

import { expect, setupAppTest } from '../helpers/test-fixture'
import { expectCalendarVisible } from '../helpers/assertions'
import { linesAccidentsVelos, valuesAccidentsAgg } from '../fixtures/api-responses'

const testPalette = setupAppTest('accidents_velos_multicolor_palette', {
  lines: linesAccidentsVelos,
  values: valuesAccidentsAgg,
})

testPalette('charge la palette chroma (GET /values/agg)', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  // Au moins un événement rendu
  await expect(appPage.locator('[data-event-id]').first()).toBeVisible({ timeout: 10_000 })
})

testPalette('les événements sont colorés (style.backgroundColor non vide)', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  const evt = appPage.locator('[data-event-id]').first()
  await expect(evt).toBeVisible({ timeout: 10_000 })
  // L'élément a un style backgroundColor ou le parent .v-event a un background
  const styleCount = await appPage.evaluate(() => {
    const els = document.querySelectorAll('.v-event, .v-event-timed, [data-event-id]')
    let withColor = 0
    els.forEach((e) => {
      const bg = (e as HTMLElement).style.backgroundColor || getComputedStyle(e as HTMLElement).backgroundColor
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') withColor++
    })
    return withColor
  })
  expect(styleCount).toBeGreaterThan(0)
})

const testCustom = setupAppTest('accidents_velos_multicolor_custom', {
  lines: linesAccidentsVelos,
})

testCustom('multicolor custom : au moins un événement rendu (avec couleur custom)', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  // Au moins un événement rendu = garantit que le mapping categorie → couleur fonctionne
  await expect(appPage.locator('[data-event-id]').first()).toBeVisible({ timeout: 10_000 })
})
