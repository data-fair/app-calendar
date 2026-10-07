// Draft mode (df:sync-config): a set-config message re-renders without a reload.
import { test, expect, openApp, datasets, jepConfig } from './fixtures'

test('set-config replaces the configuration', async ({ page }) => {
  await openApp(page)
  await expect(page.getByText('Visite du musée')).toBeVisible()
  await page.evaluate((configuration) => {
    window.postMessage({ type: 'set-config', content: { configuration } }, '*')
  }, { ...jepConfig, labelField: { key: 'location_city', label: 'Commune' }, datasets: [datasets.jep] })
  await expect(page.getByText('Visite du musée')).toHaveCount(0)
  await expect(page.getByText('Paris')).toBeVisible()
})
