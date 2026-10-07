import { defineConfig, devices } from '@playwright/test'

// E2E_PORT vient du .env généré par df-dev-env (via dotenv -- dans les scripts
// npm) ; le fallback 4100 ne sert qu'à un lancement direct de playwright.
const PORT = Number(process.env.E2E_PORT ?? 4100)
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.spec\.ts$/,
  outputDir: './tests/output',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    // tolerant to font anti-aliasing, not to a moved or missing element
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 }
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // one browser: under load (dev servers, other sessions) parallel workers time out
  // without saying anything about the code
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    ...devices['Desktop Chrome'],
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 800 },
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },

  projects: [{ name: 'e2e' }],

  // window.APPLICATION is injected and every API is mocked (tests/e2e/fixtures.ts):
  // only Vite is needed. server.warmup (vite.config.mjs) pre-transforms the module
  // graph at startup, so a cold server does not race the first test.
  webServer: {
    command: 'npm run dev-app',
    url: `${BASE_URL}/app/`,
    // APP_PORT (lu par loadEnv) aligne serveur et HMR sur le port E2E ;
    // PUBLIC_URL force la base /app/ quel que soit le shell.
    env: { ...process.env, APP_PORT: String(PORT), PUBLIC_URL: '/app/' },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
})
