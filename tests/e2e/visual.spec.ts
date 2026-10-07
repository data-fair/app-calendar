// Visual regression of the three main views, desktop and mobile, plus the dark theme.
import { test, expect, openApp, jepConfig, datasets, type Page } from './fixtures'

const views = { month: 'dayGridMonth', week: 'timeGridWeek', planning: 'planning' }

async function openView (page: Page, initialView: string) {
  await openApp(page, { config: { ...jepConfig, initialView, datasets: [datasets.jep] } })
  await expect(page.getByText('Visite du musée')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

for (const [device, viewport] of Object.entries({ desktop: { width: 1280, height: 800 }, mobile: { width: 390, height: 844 } })) {
  test.describe(device, () => {
    test.use({ viewport })
    for (const [view, initialView] of Object.entries(views)) {
      test(view, async ({ page }) => {
        await openView(page, initialView)
        await expect(page).toHaveScreenshot(`${view}-${device}.png`)
      })
    }
  })
}

test.describe('dark', () => {
  test.use({ colorScheme: 'dark' })
  test('month', async ({ page }) => {
    await openView(page, views.month)
    await expect(page.locator('.v-application')).toHaveClass(/v-theme--dark/)
    await expect(page).toHaveScreenshot('month-dark.png')
  })
})
