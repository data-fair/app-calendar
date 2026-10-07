// Incomplete configuration: the calendar is replaced by an empty state, and the
// error is reported to data-fair (POST href/error).
import { test, expect, setupMocks, buildApplication, gotoApp } from './fixtures'

for (const [name, configuration] of [['no configuration', undefined], ['no dataset', { datasets: [] }]] as const) {
  test(name, async ({ page }) => {
    await setupMocks(page, buildApplication(configuration as Record<string, unknown>))
    const reported = page.waitForRequest(req => req.method() === 'POST' && req.url().endsWith('/applications/test-app/error'))
    await gotoApp(page)
    await expect(page.getByText('Configuration incomplète')).toBeVisible()
    await expect(page.getByText('Veuillez sélectionner une source de données')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Suivant' })).toHaveCount(0)
    await reported
  })
}
