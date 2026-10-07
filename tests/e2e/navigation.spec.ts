// Navigation in the simple layout: periods, views, URL state, date picker.
import { test, expect, openApp, type Page } from './fixtures'

const weekDays = (page: Page) => page.getByRole('grid').getByRole('button')

test('month: next, previous and today', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Suivant' }).click()
  await expect(page.getByRole('button', { name: 'Novembre 2026' })).toBeVisible()
  await page.getByRole('button', { name: 'Précédent' }).click()
  await page.getByRole('button', { name: 'Précédent' }).click()
  await expect(page.getByRole('button', { name: 'Septembre 2026' })).toBeVisible()
  await page.getByRole('button', { name: 'Aujourd\'hui' }).click()
  await expect(page.getByRole('button', { name: 'Octobre 2026' })).toBeVisible()
  await expect(page.getByText('Visite du musée')).toBeVisible()
})

// regression: two calendar data instances sent every /lines request twice, with no loading feedback
test('a period change loads its events once, under a loading bar', async ({ page }) => {
  await openApp(page)
  await expect(page.getByText('Visite du musée')).toBeVisible()
  const requests: string[] = []
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/lines')) requests.push(request.url()) })
  await page.getByRole('button', { name: 'Suivant' }).click()
  await expect(page.getByRole('progressbar')).toBeVisible()
  await expect(page.getByRole('progressbar')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Novembre 2026' })).toBeVisible()
  expect(requests).toHaveLength(1)
})

test('switching to week keeps the displayed date, today returns to the current week', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByRole('button', { name: 'Semaine' }).click()
  await expect(page.getByRole('button', { name: 'Semaine' })).toHaveAttribute('aria-pressed', 'true')
  // the month moved to 1 November, the week is the one that contains it
  await expect(weekDays(page)).toHaveText(['26', '27', '28', '29', '30', '31', '1'])
  await page.getByRole('button', { name: 'Aujourd\'hui' }).click()
  await expect(weekDays(page)).toHaveText(['5', '6', '7', '8', '9', '10', '11'])
})

test('the URL carries view and date, a reload restores them', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByRole('button', { name: 'Semaine' }).click()
  await expect(page).toHaveURL(/[?&]view=week/)
  await expect(page).toHaveURL(/[?&]date=2026-11-01/)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Semaine' })).toHaveAttribute('aria-pressed', 'true')
  await expect(weekDays(page)).toHaveText(['26', '27', '28', '29', '30', '31', '1'])
})

test('the title opens a date picker that selects a date', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Semaine' }).click()
  await page.getByRole('button', { name: 'Octobre 2026' }).click()
  await page.getByRole('button', { name: 'jeudi 22 octobre 2026' }).click()
  await expect(page.getByRole('button', { name: 'jeudi 22 octobre 2026' })).toBeHidden()
  await expect(weekDays(page)).toHaveText(['19', '20', '21', '22', '23', '24', '25'])
})

// regression: v-date-picker emits a Date, the URL used to get date=Thu+Oct+22+2026+…
test('a date picked in the picker is written to the URL as YYYY-MM-DD', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Octobre 2026' }).click()
  await page.getByRole('button', { name: 'jeudi 22 octobre 2026' }).click()
  await expect(page).toHaveURL(/[?&]date=2026-10-22(&|$)/, { timeout: 2000 })
})

// regression: the next button used to stop responding after a few quick clicks
test('quick repeated clicks on next advance one period each', async ({ page }) => {
  await openApp(page)
  const next = page.getByRole('button', { name: 'Suivant' })
  for (let i = 0; i < 6; i++) {
    await next.click()
    await page.waitForTimeout(150)
  }
  await expect(page.getByRole('button', { name: 'Avril 2027' })).toBeVisible()
})
