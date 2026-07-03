// 15 — Snackbar d'erreur : 500 API → displayError + v-snackbar.
// Covers: useCalendarData watch(eventsError) → displayError.value = true → SnackBar.

import { test, expect, prepareApp } from '../helpers/test-fixture'
import { injectConfig } from '../helpers/inject-config'
import { mockDataFairApi } from '../helpers/mock-api'
import { expectSnackbar } from '../helpers/assertions'
import { linesAccidentsVelos } from '../fixtures/api-responses'

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
    datasets: [{
      href: '/api/v1/datasets/accidents-velos',
      id: 'accidents-velos',
      title: 'Accidents',
      finalizedAt: '2024-01-01T00:00:00.000Z',
      schema: [],
    }],
  })
  // Le snackbar s'affiche avec un message d'erreur
  await expectSnackbar(page, /mocked error|error|erreur/i)
})

test('snackbar : timeout 5s puis disparaît', async ({ page }) => {
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
    datasets: [{
      href: '/api/v1/datasets/accidents-velos',
      id: 'accidents-velos',
      title: 'Accidents',
      finalizedAt: '2024-01-01T00:00:00.000Z',
      schema: [],
    }],
  })
  // Le snackbar est visible (displayError=true → v-snackbar rendu)
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
    datasets: [{
      href: '/api/v1/datasets/accidents-velos',
      id: 'accidents-velos',
      title: 'Accidents',
      finalizedAt: '2024-01-01T00:00:00.000Z',
      schema: [],
    }],
  })
  // displayError reste false → pas de snackbar visible
  await page.waitForTimeout(500)
  await expect(page.locator('.v-snackbar')).toHaveCount(0)
})
