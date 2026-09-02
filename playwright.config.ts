import { defineConfig, devices } from '@playwright/test'

// E2E_PORT vient du .env généré par df-dev-env (via dotenv -- dans les scripts
// npm) ; le fallback 4100 ne sert qu'à un lancement direct de playwright.
const PORT = Number(process.env.E2E_PORT ?? 4100)
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests-e2e',
  // Crawl des modules source après le démarrage du Vite webServer : déclenche
  // la découverte des deps avant le premier test (sinon Vite re-optimise et
  // recharge la page en plein test, perdant la config injectée par postMessage).
  globalSetup: './tests-e2e/global-setup.ts',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Borner les workers locaux : à 16 workers contre un seul serveur Vite, les
  // timeouts de montage (waitForAppReady, v-calendar) explosent sous charge.
  workers: process.env.CI ? 1 : 4,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // The tests are fully self-contained:
  // - window.APPLICATION is injected via page.addInitScript() in helpers/test-fixture.ts
  // - DataFair API endpoints are mocked via page.route() in helpers/mock-api.ts
  // - Calendar configuration is injected via postMessage('set-config') in helpers/inject-config.ts
  // Only Vite is needed to serve the app HTML/JS bundle.
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
