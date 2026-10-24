// Per-occurrence exceptions of an opening hours series.
import { test, expect, openApp, datasets, recurrenceConfig, openingConfig, type Line, type Page } from './fixtures'

const ds = datasets.openingAdmin
const line = (exceptions?: unknown[]): Line => ({
  _id: 'oh-1',
  title: 'Atelier',
  start: '2026-10-05T09:00:00+02:00',
  end: '2026-10-30T17:00:00+01:00',
  hours: 'Mo 09:00-17:00',
  ...(exceptions ? { exceptions } : {}),
})

const weekConfig = { ...recurrenceConfig, initialView: 'timeGridWeek', datasets: [ds] }
const planningConfig = { ...recurrenceConfig, initialView: 'planning', datasets: [ds] }

const openWeek = (page: Page, exceptions?: unknown[]) =>
  openApp(page, { dataset: ds, config: weekConfig, lines: [line(exceptions)] })
const openPlanning = (page: Page, exceptions?: unknown[]) =>
  openApp(page, { dataset: ds, config: planningConfig, lines: [line(exceptions)] })

test('dragging one occurrence stores a start/end exception, not a series change', async ({ page }) => {
  // two slots on Monday: the second one catches a drag that would reuse the first occurrence
  const twoSlots = { ...line(), hours: 'Mo 09:00-12:00,14:00-18:00' }
  await openApp(page, { dataset: ds, config: weekConfig, lines: [twoSlots] })
  await expect(page.getByText('Atelier').first()).toBeVisible()
  // the week view scrolls to the first event once loaded: read the box after it
  await page.waitForFunction(() => {
    const scrollArea = document.querySelector('.v-calendar-daily__scroll-area') as HTMLElement | null
    return !!scrollArea && scrollArea.scrollTop > 0
  })

  const box = (await page.getByText('Atelier').nth(1).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + 20)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + 40, { steps: 8 })
  await page.mouse.up()

  await expect(page.getByText('Modifier un événement')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Cette occurrence' })).toBeChecked()

  const patched = page.waitForRequest(req => req.method() === 'PATCH' && req.url().includes('/lines/oh-1'))
  await page.getByRole('button', { name: 'Valider', exact: true }).click()
  const body = (await patched).postDataJSON() as { exceptions: Array<Record<string, any>> }

  expect(body.exceptions).toHaveLength(1)
  expect(body.exceptions[0].occurrence).toBe('2026-10-05T14:00')
  expect(body.exceptions[0].values.start).toBeTruthy()
  expect(body.exceptions[0].values.end).toBeTruthy()
  // only the moved dates are stored, the series title is not duplicated
  expect(body.exceptions[0].values.title).toBeUndefined()
})

test('deleting one occurrence patches the exception instead of deleting the line', async ({ page }) => {
  await openWeek(page)
  const deletes: string[] = []
  page.on('request', req => { if (req.method() === 'DELETE') deletes.push(req.url()) })

  await page.getByText('Atelier').first().click()
  await page.getByRole('button', { name: 'Supprimer l\'événement' }).click()
  await expect(page.getByRole('radio', { name: 'Cette occurrence' })).toBeChecked()

  const patched = page.waitForRequest(req => req.method() === 'PATCH' && req.url().includes('/lines/oh-1'))
  await page.getByRole('button', { name: 'Supprimer l\'événement' }).last().click()
  const body = (await patched).postDataJSON() as { exceptions: Array<Record<string, unknown>> }

  expect(body.exceptions).toEqual([{ occurrence: '2026-10-05T09:00', cancelled: true }])
  expect(deletes).toEqual([])
})

test('deleting the whole series still deletes the line', async ({ page }) => {
  await openWeek(page)

  await page.getByText('Atelier').first().click()
  await page.getByRole('button', { name: 'Supprimer l\'événement' }).click()
  await page.getByRole('radio', { name: 'Toute la série' }).check()
  await expect(page.getByText('Cette action supprimera toutes les occurrences de la série.')).toBeVisible()

  const deleted = page.waitForRequest(req => req.method() === 'DELETE' && req.url().endsWith('/lines/oh-1'))
  await page.getByRole('button', { name: 'Supprimer l\'événement' }).last().click()
  await deleted
})

test('restoring a cancelled occurrence removes its exception', async ({ page }) => {
  await openWeek(page, [{ occurrence: '2026-10-12T09:00', cancelled: true }])

  await page.getByText('Atelier').first().click()
  await page.getByRole('button', { name: 'Modifier l\'événement' }).click()
  await page.getByRole('radio', { name: 'Toute la série' }).check()
  await expect(page.getByText('Exceptions de la série')).toBeVisible()
  await expect(page.getByText('Annulée')).toBeVisible()

  const patched = page.waitForRequest(req => req.method() === 'PATCH' && req.url().includes('/lines/oh-1'))
  await page.getByRole('button', { name: 'Rétablir' }).click()
  const body = (await patched).postDataJSON() as { exceptions: unknown[] }
  expect(body.exceptions).toEqual([])
})

test('saving the whole series keeps its exceptions', async ({ page }) => {
  await openWeek(page, [{ occurrence: '2026-10-12T09:00', cancelled: true }])

  await page.getByText('Atelier').first().click()
  await page.getByRole('button', { name: 'Modifier l\'événement' }).click()
  await page.getByRole('radio', { name: 'Toute la série' }).check()
  await page.getByRole('textbox', { name: 'Titre' }).fill('Atelier série')

  const saved = page.waitForRequest(req => req.method() === 'PUT' && req.url().endsWith('/lines/oh-1'))
  await page.getByRole('button', { name: 'Valider', exact: true }).click()
  const body = (await saved).postData() ?? ''

  expect(body).toContain('"title":"Atelier série"')
  expect(body).toContain('"exceptions":[{"occurrence":"2026-10-12T09:00","cancelled":true}]')
})

test('deleting one occurrence from the planning patches the exception', async ({ page }) => {
  await openPlanning(page)

  await page.getByText('Atelier').first().click()
  await page.getByRole('button', { name: 'Supprimer l\'événement' }).click()
  await expect(page.getByRole('radio', { name: 'Cette occurrence' })).toBeChecked()

  const patched = page.waitForRequest(req => req.method() === 'PATCH' && req.url().includes('/lines/oh-1'))
  await page.getByRole('button', { name: 'Supprimer l\'événement' }).last().click()
  const body = (await patched).postDataJSON() as { exceptions: Array<Record<string, unknown>> }

  expect(body.exceptions).toEqual([{ occurrence: '2026-10-12T09:00', cancelled: true }])
})

test('without the setting the series form keeps its current behaviour', async ({ page }) => {
  await openApp(page, {
    dataset: ds,
    config: { ...openingConfig, initialView: 'timeGridWeek', datasets: [ds] },
    lines: [line()],
  })

  await page.getByText('Atelier').first().click()
  await page.getByRole('button', { name: 'Modifier l\'événement' }).click()
  await expect(page.getByRole('radio', { name: 'Cette occurrence' })).toHaveCount(0)
  await expect(page.getByText('Lundi')).toBeVisible()
})
