// Common assertions for app-calendar tests.
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** Assert that the Vuetify <v-calendar> component is visible.
 *  Waits for the toolbar (rendered synchronously) and the calendar grid
 *  (rendered by an async component, which takes a moment to mount). */
export async function expectCalendarVisible (page: Page) {
  // Toolbar renders first (Calendar component is async)
  await expect(page.locator('.v-toolbar').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.v-calendar').first()).toBeVisible({ timeout: 15_000 })
  // Wait for the day cells to render (proves the calendar is fully initialized)
  await page.waitForFunction(
    () => document.querySelectorAll('.v-calendar-weekly__day, .v-calendar-daily__day').length > 0,
    null,
    { timeout: 15_000 }
  )
}

/** Assert that the `<v-empty-state>` error component is shown. */
export async function expectEmptyState (page: Page) {
  await expect(page.locator('.v-empty-state').first()).toBeVisible({ timeout: 10_000 })
}

/** Assert that the empty state is NOT rendered. */
export async function expectNoEmptyState (page: Page) {
  await expect(page.locator('.v-empty-state')).toHaveCount(0)
}

/** Assert that window.vIframeOptions is exposed (set at module level in main.ts). */
export async function expectViframeOptionsSet (page: Page) {
  const ok = await page.evaluate(() => {
    const opts = (window as any).vIframeOptions
    return !!opts && typeof opts.reactiveParams === 'object' && opts.reactiveParams !== null
  })
  expect(ok).toBe(true)
}

/** Assert that window.iFrameResizer is configured. */
export async function expectIFrameResizerSet (page: Page) {
  const ok = await page.evaluate(() => {
    const r = (window as any).iFrameResizer
    return !!r && typeof r.heightCalculationMethod === 'string'
  })
  expect(ok).toBe(true)
}

/** Assert that a given view is currently rendered (month/week/day/planning). */
export async function expectViewType (page: Page, view: 'month' | 'week' | 'day' | 'planning') {
  const selector =
    view === 'planning'
      ? '.planning-day-header, .planning-empty-message'
      : '.v-calendar'
  await expect(page.locator(selector).first()).toBeVisible({ timeout: 10_000 })
}

/** Assert that the snackbar is showing the given message. */
export async function expectSnackbar (page: Page, message: string | RegExp) {
  await expect(page.locator('.v-snackbar__content')).toContainText(message as string, { timeout: 5_000 })
}

/** Read the current value of a reactiveSearchParams property. */
export async function getSearchParam (page: Page, key: string) {
  return page.evaluate((k) => {
    const opts = (window as any).vIframeOptions
    return opts?.reactiveParams?.[k] ?? null
  }, key)
}
