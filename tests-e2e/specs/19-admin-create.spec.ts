// 19 — Admin : création d'un événement en cliquant sur une date, puis soumission
// du formulaire (POST /lines).
// Covers: Calendar.vue onClickDate → EventDetails mode edit → EventEdit saveEvent() (POST).

import { expect, setupAppTest } from '../helpers/test-fixture'
import { expectCalendarVisible } from '../helpers/assertions'
import { linesJepAdmin, linesJepAdminSingle, safeSchemaJep } from '../fixtures/api-responses'

const test = setupAppTest('jep_admin_week', {
  lines: linesJepAdmin,
  singleLine: linesJepAdminSingle,
  safeSchema: safeSchemaJep,
})

test('clic sur une date : ouvre la modale de création « Ajouter un événement »', async ({ appPage }) => {
  await expectCalendarVisible(appPage)
  await appPage.locator('.v-calendar-daily_head-day-label button').first().click()
  await expect(appPage.locator('.v-menu .v-card').first()).toBeVisible({ timeout: 5_000 })
  await expect(appPage.locator('.v-menu').locator('text=Ajouter un événement').first()).toBeVisible({ timeout: 15_000 })
})

test('soumettre le formulaire de création envoie un POST /lines', async ({ appPage }) => {
  const posts: string[] = []
  appPage.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/lines')) posts.push(req.url())
  })
  await expectCalendarVisible(appPage)
  await appPage.locator('.v-calendar-daily_head-day-label button').first().click()
  await appPage.locator('.v-menu').locator('text=Ajouter un événement').first().waitFor({ state: 'visible', timeout: 15_000 })
  const validate = appPage.locator('.v-menu button:has-text("Valider")').first()
  await expect(validate).toBeEnabled({ timeout: 8_000 })
  await validate.click()
  await expect.poll(() => posts.length, { timeout: 5_000 }).toBeGreaterThan(0)
})
