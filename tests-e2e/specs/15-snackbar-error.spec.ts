// 15 — Snackbar d'erreur : 500 API → useUiNotif → <DfUiNotif /> (v-snackbar-queue).
// Covers: useCalendarData watch(eventsError) → sendUiNotif({ type: 'error', ... }) → DfUiNotif render.

import { test, expect, prepareApp } from '../helpers/test-fixture'
import { injectConfig } from '../helpers/inject-config'
import { mockDataFairApi } from '../helpers/mock-api'
import { expectSnackbar } from '../helpers/assertions'
import { linesAccidentsVelos } from '../fixtures/api-responses'
import { makeDatasetEntry } from '../fixtures/datasets'

test('erreur /lines → snackbar rouge avec le message d\'erreur', async ({ page }) => {
  await prepareApp(page)
  await page.goto('/app/')
  await mockDataFairApi(page, 'accidents-velos', {
    lines: linesAccidentsVelos,
    linesErrors: true,
  })
  await injectConfig(page, {
    color: { type: 'monochrome', colors: { type: 'theme', strValue: 'primary' } },
    initialView: 'dayGridMonth',
    openOnCurrentDay: true,
    labelField: { key: 'Num_Acc', label: 'Identifiant accident' },
    additionalFields: [],
    datasets: [makeDatasetEntry('accidents_velos')],
  })
  // Le snackbar s'affiche avec un message d'erreur
  await expectSnackbar(page, /mocked error|error|erreur/i)
})

test('snackbar d\'erreur est visible', async ({ page }) => {
  await prepareApp(page)
  await page.goto('/app/')
  await mockDataFairApi(page, 'accidents-velos', {
    lines: linesAccidentsVelos,
    linesErrors: true,
  })
  await injectConfig(page, {
    color: { type: 'monochrome', colors: { type: 'theme', strValue: 'primary' } },
    initialView: 'dayGridMonth',
    openOnCurrentDay: true,
    labelField: { key: 'Num_Acc', label: 'Identifiant accident' },
    additionalFields: [],
    datasets: [makeDatasetEntry('accidents_velos')],
  })
  // Le snackbar est visible (sendUiNotif → DfUiNotif → v-snackbar rendu)
  const snackbar = page.locator('.v-snackbar')
  await expect(snackbar.first()).toBeVisible({ timeout: 10_000 })
})

test('pas d\'erreur API : pas de snackbar rendu', async ({ page }) => {
  await prepareApp(page)
  await page.goto('/app/')
  await mockDataFairApi(page, 'accidents-velos', { lines: linesAccidentsVelos })
  await injectConfig(page, {
    color: { type: 'monochrome', colors: { type: 'theme', strValue: 'primary' } },
    initialView: 'dayGridMonth',
    openOnCurrentDay: true,
    labelField: { key: 'Num_Acc', label: 'Identifiant accident' },
    additionalFields: [],
    datasets: [makeDatasetEntry('accidents_velos')],
  })
  // Aucune erreur → sendUiNotif non appelé → pas de snackbar visible
  await page.waitForTimeout(500)
  await expect(page.locator('.v-snackbar')).toHaveCount(0)
})
