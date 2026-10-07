// A failing data request is reported in a snackbar.
import { test, expect, openApp } from './fixtures'

test.use({ expectedConsole: ['status of 500'] })

test('events request in error', async ({ page }) => {
  await openApp(page, { lines: { status: 500 } })
  await expect(page.getByText('Erreur lors du chargement des événements')).toBeVisible()
})
