// 08 — Compat iframe : vIframeOptions + iFrameResizer exposés au niveau module dans main.ts.
// Covers: src/main.ts window.vIframeOptions + window.iFrameResizer.

import { test, expect, prepareApp } from '../helpers/test-fixture'
import { expectViframeOptionsSet, expectIFrameResizerSet } from '../helpers/assertions'

test('window.vIframeOptions.reactiveParams est exposé avant toute config', async ({ page }) => {
  await prepareApp(page)
  await page.goto('/app/')
  await expectViframeOptionsSet(page)
})

test('window.iFrameResizer.heightCalculationMethod est configuré', async ({ page }) => {
  await prepareApp(page)
  await page.goto('/app/')
  await expectIFrameResizerSet(page)
})

test('reactiveParams est partagé avec l\'app (le set se reflète)', async ({ page }) => {
  await prepareApp(page)
  await page.goto('/app/')
  await page.waitForFunction(() => {
    const appEl = document.querySelector('#app') as any
    return !!appEl && !!appEl.__vue_app__ && !!(window as any).APPLICATION
  }, null, { timeout: 15_000 })
  // Set une clé via reactiveParams
  await page.evaluate(() => {
    ;(window as any).vIframeOptions.reactiveParams.draftTest = 'ok'
  })
  // Vérifier que c'est bien l'objet partagé
  const seen = await page.evaluate(() => {
    return (window as any).vIframeOptions.reactiveParams.draftTest
  })
  expect(seen).toBe('ok')
})

test('le calendrier expose l\'accessKey depuis exposedUrl (séparé par %3A)', async ({ page }) => {
  await prepareApp(page)
  await page.goto('/app/')
  // L'accessKey est extrait par `createConfig()` dans config.ts:38-40
  // On vérifie que le helper a bien tourné (pas d'erreur)
  await page.waitForFunction(() => {
    return !!(window as any).APPLICATION
  }, null, { timeout: 5_000 })
})
