// Helpers to inject a configuration into a running app instance
// via the `set-config` postMessage protocol the app already supports
// (see src/composables/config.ts).
import type { Page } from '@playwright/test'

/**
 * Wait for the Vue app to be mounted, the message listener installed
 * (so we don't lose the postMessage we're about to send) and the
 * dev-server-injected `window.APPLICATION` to be defined.
 */
export async function waitForAppReady (page: Page) {
  await page.waitForFunction(() => {
    const appEl = document.querySelector('#app') as any
    return !!appEl && !!appEl.__vue_app__ && !!(window as any).APPLICATION
  }, null, { timeout: 15_000 })
}

/**
 * Send a full configuration to the app via postMessage. The config is
 * shaped like window.APPLICATION.configuration. The first call replaces
 * the configuration; subsequent calls re-trigger the same `set-config`
 * handler (the app uses it for draft-mode updates from DataFair).
 */
export async function injectConfig (page: Page, config: Record<string, any>) {
  await waitForAppReady(page)
  await page.evaluate((cfg) => {
    window.postMessage({ type: 'set-config', content: { configuration: cfg } }, '*')
  }, config)
}

/**
 * Wait for the Vuetify `<v-calendar>` component to be in the DOM AND for its
 * day cells to be rendered. Times out if the empty state is shown instead
 * (configuration error) or if the async component never mounts.
 */
export async function waitForCalendar (page: Page, timeout = 20_000) {
  await page.locator('.v-calendar').first().waitFor({ state: 'visible', timeout })
  await page.waitForFunction(
    () => document.querySelectorAll('.v-calendar-weekly__day, .v-calendar-daily__day').length > 0,
    null,
    { timeout }
  )
}
