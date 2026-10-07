// Event details in the simple layout: read only.
import { test, expect, openApp } from './fixtures'

test('a click on an event shows its details, Escape closes them', async ({ page }) => {
  await openApp(page)
  await page.getByText('Visite du musée').click()
  const title = page.getByRole('heading', { name: 'Visite du musée' })
  await expect(title).toBeVisible()
  await expect(page.getByText('mer. 7 oct. 2026, 09:00 - 12:00')).toBeVisible()
  // additional field: its title and its value
  await expect(page.getByText('Commune')).toBeVisible()
  await expect(page.getByText('Paris')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Modifier l\'événement' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(title).toBeHidden()
})
