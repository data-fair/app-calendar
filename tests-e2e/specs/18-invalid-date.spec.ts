// 18 — Régression : une date invalide (ex. jour 32) ne doit pas faire boucler
// l'application à l'infini (bug corrigé dans usePlanningData / useCalendarData /
// useCalendarEvents). Le planning et le calendrier doivent se rendre normalement.
// Covers: usePlanningData.planningDays guard, useCalendarEvents.buildEvents guard.

import { expect, setupAppTest } from '../helpers/test-fixture'
import { linesAccidentsInvalidDate, linesJepInvalidDate } from '../fixtures/api-responses'

// Planning : une date-time invalide (jour 32, ne "roll-over" pas dans dayjs) →
// état vide rendu sans se figer (régression de l'infinite loop).
const testPlanning = setupAppTest('jep_planning', { linesPaginated: linesJepInvalidDate })

testPlanning('date invalide dans le planning : rend l\'état vide sans se figer', async ({ appPage }) => {
  await expect(appPage.locator('.planning-empty-message')).toContainText('Aucun événement', { timeout: 10_000 })
})

// Vue Mois : une date invalide → le calendrier se rend sans se figer.
const testMonth = setupAppTest('accidents_velos_month', { lines: linesAccidentsInvalidDate })

testMonth('date invalide en vue Mois : le calendrier se rend sans se figer', async ({ appPage }) => {
  await expect(appPage.locator('.v-calendar-weekly__day').first()).toBeVisible({ timeout: 10_000 })
})
