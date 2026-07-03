// 01 — Configuration errors: empty state when config is missing or has no dataset.
// Covers: src/composables/config.ts `error` computed → <v-empty-state> in App.vue.

import { test, expect, prepareApp, setupAppTest } from '../helpers/test-fixture'
import { injectConfig } from '../helpers/inject-config'
import { expectEmptyState, expectNoEmptyState } from '../helpers/assertions'

test('configuration vide : affiche le v-empty-state « pas de configuration »', async ({ page }) => {
  await prepareApp(page)
  await page.goto('/app/')
  // Empty config → `config.value` is falsy → "Il n'y a pas de configuration définie"
  await injectConfig(page, {})
  await expectEmptyState(page)
})

test('configuration avec datasets vide : affiche le v-empty-state « sélectionnez une source »', async ({ page }) => {
  await prepareApp(page)
  await page.goto('/app/')
  // `datasets: []` makes `dataset` computed undefined → "Veuillez sélectionner une source"
  await injectConfig(page, { datasets: [] })
  await expect(page.locator('.v-empty-state')).toContainText('source de données')
})

const validTest = setupAppTest('accidents_velos_month', {})

validTest('configuration valide : n\'affiche PAS le v-empty-state', async ({ appPage }) => {
  await expectNoEmptyState(appPage)
})
