// Planning view: upcoming events grouped by day, loaded page by page on scroll.
import { test, expect, openApp, setupMocks, buildApplication, gotoApp, datasets, jepConfig, type Line } from './fixtures'

const planningConfig = (ds: typeof datasets.jep, labelKey = 'title_fr') =>
  ({ ...jepConfig, initialView: 'planning', labelField: { key: labelKey, label: 'Titre' }, datasets: [ds] })

test('lists upcoming events by day, without period navigation', async ({ page }) => {
  await openApp(page, { config: planningConfig(datasets.jep) })
  await expect(page.getByRole('button', { name: 'Planning' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Mercredi 7 octobre 2026')).toBeVisible()
  await expect(page.getByText('Visite du musée')).toBeVisible()
  await expect(page.getByText('Concert du soir')).toBeVisible()
  // 5 October is past
  await expect(page.getByText('Exposition photo')).toHaveCount(0)
  for (const name of ['Aujourd\'hui', 'Précédent', 'Suivant']) {
    await expect(page.getByRole('button', { name })).toHaveCount(0)
  }
})

// regression: a long recurring event used to fill the list, and a one-off event
// of a later page (25 June 2027) never showed
test('infinite scroll reaches a one-off event behind a long recurring one', async ({ page }) => {
  const opening = (id: string, title: string, start: string, end: string, hours?: string): Line =>
    ({ _id: id, title, start, end, ...(hours ? { hours } : {}) })
  const pages = [[
    opening('rec', 'Permanence', '2025-01-06T14:00:00+01:00', '2027-08-30T18:00:00+02:00', 'Mo 14:00-18:00'),
    opening('near-1', 'Visite guidée', '2026-10-09T10:00:00+02:00', '2026-10-09T12:00:00+02:00'),
    opening('near-2', 'Atelier', '2026-10-15T10:00:00+02:00', '2026-10-15T12:00:00+02:00')
  ], [
    opening('one-off', 'Fête de la musique', '2027-06-25T19:00:00+02:00', '2027-06-25T23:00:00+02:00')
  ]]
  await openApp(page, { dataset: datasets.opening, config: planningConfig(datasets.opening, 'title'), lines: pages })
  await expect(page.getByText('Visite guidée')).toBeVisible()

  // scroll down step by step: the second page is only requested at the end of the list
  const header = page.getByText('Vendredi 25 juin 2027')
  await page.getByText('Visite guidée').hover()
  await expect(async () => {
    await page.mouse.wheel(0, 400)
    await expect(header).toBeInViewport({ timeout: 200 })
  }).toPass({ timeout: 20_000 })

  // rows grouped under their day header (no accessible grouping in the list)
  const rowsByDay = await page.evaluate(() => {
    const days: Record<string, string[]> = {}
    let day = ''
    for (const el of document.querySelectorAll('.planning-day-header, .planning-event-row')) {
      if (el.classList.contains('planning-day-header')) days[day = el.textContent!.trim()] = []
      else days[day].push(el.querySelector('.v-list-item-title')!.textContent!.trim())
    }
    return days
  })
  expect(rowsByDay['Vendredi 25 juin 2027']).toEqual(['Fête de la musique'])
  const recurringDays = Object.keys(rowsByDay).filter(d => rowsByDay[d].includes('Permanence'))
  expect(recurringDays[0]).toBe('Lundi 12 octobre 2026')
  expect(recurringDays.at(-1)).toBe('Lundi 30 août 2027')
  expect(recurringDays.length).toBe(47)
  expect(recurringDays.filter(d => !d.startsWith('Lundi '))).toEqual([])
})

test('empty dataset', async ({ page }) => {
  await openApp(page, { config: planningConfig(datasets.jep), lines: [] })
  await expect(page.getByText('Aucun événement à venir')).toBeVisible()
})

// regression: opened directly in planning view, the calendar data fetched /lines without a
// date range and crashed on the opening hours of a recurring line (start undefined)
test('a recurring event does not crash the planning', async ({ page }) => {
  const ds = datasets.opening
  await setupMocks(page, buildApplication(planningConfig(ds, 'title')))
  await page.route(`**${ds.href}/lines?**`, route => route.fulfill({
    json: { total: 1, results: [{ _id: 'rec', title: 'Permanence', start: '2025-01-06T14:00:00+01:00', end: '2027-08-30T18:00:00+02:00', hours: 'Mo 14:00-18:00' }] }
  }))
  await gotoApp(page)
  await expect(page.getByText('Lundi 12 octobre 2026')).toBeVisible()
})
