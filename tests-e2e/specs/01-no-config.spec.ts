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

// P1-5 : dataset sans labelField (config sans labelField + schema sans rdfs:label)
const testNoLabel = setupAppTest('no_label_field', {})

testNoLabel('dataset sans champ de libellé : affiche le v-empty-state « champ de libellé »', async ({ appPage }) => {
  // accidents_velos n'a pas de rdfs:label dans son schéma et la config ne fixe pas labelField
  // → error computed retourne "Veuillez sélectionner un champ de libellé"
  await expectEmptyState(appPage)
  await expect(appPage.locator('.v-empty-state')).toContainText('champ de libellé')
})

// P1-5 : dataset sans aucun champ de date (ni startDate, ni endDate, ni schema.org/Date)
const testNoDate = setupAppTest('no_date_field', {})

testNoDate('dataset sans champ de date : affiche le v-empty-state « Aucun champ de date »', async ({ appPage }) => {
  // accidents_no_date n'a aucun concept de date dans son schéma
  // → error computed retourne "Aucun champ de date trouvé dans le dataset"
  await expectEmptyState(appPage)
  await expect(appPage.locator('.v-empty-state')).toContainText('Aucun champ de date')
})

const validTest = setupAppTest('accidents_velos_month', {})

validTest('configuration valide : n\'affiche PAS le v-empty-state', async ({ appPage }) => {
  await expectNoEmptyState(appPage)
})
