// Admin layout (REST dataset + line permissions): create, edit, delete, drag.
import { test, expect, openApp, datasets, jepConfig, jepLines, openingConfig, type Page } from './fixtures'

const weekConfig = { ...jepConfig, initialView: 'timeGridWeek', datasets: [datasets.jepAdmin] }
const openAdmin = (page: Page) => openApp(page, { dataset: datasets.jepAdmin, config: weekConfig })
const editTitle = (page: Page) => page.getByText('Modifier un événement')

test('create an event from a day of the week', async ({ page }) => {
  // first spec of the run: the dev server compiles the vjsf form graph on this first opening,
  // ~13 s from a cold server and more when quality runs it right after a build (~6 s warm)
  test.slow()
  await openAdmin(page)
  await page.getByRole('grid').getByRole('button', { name: '8', exact: true }).click()
  await expect(page.getByText('Ajouter un événement')).toBeVisible({ timeout: 30_000 })
  const created = page.waitForRequest(req => req.method() === 'POST' && req.url().endsWith('/datasets/jep-admin/lines'))
  await page.getByRole('button', { name: 'Valider', exact: true }).click()
  await created
  await expect(page.getByText('Événement créé')).toBeVisible()
})

test('edit mode disables the toolbar, closing restores it', async ({ page }) => {
  await openAdmin(page)
  await page.getByText('Visite du musée').click()
  await page.getByRole('button', { name: 'Modifier l\'événement' }).click()
  await expect(editTitle(page)).toBeVisible()
  for (const name of ['Aujourd\'hui', 'Suivant', 'Mois']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeDisabled()
  }
  await page.getByRole('button', { name: 'Fermer' }).click()
  await expect(editTitle(page)).toBeHidden()
  await expect(page.getByRole('button', { name: 'Suivant' })).toBeEnabled()
})

test('delete an event after confirmation', async ({ page }) => {
  await openAdmin(page)
  await page.getByText('Visite du musée').click()
  await page.getByRole('button', { name: 'Supprimer l\'événement' }).click()
  await expect(page.getByText('Voulez vous vraiment supprimer l\'événement ?')).toBeVisible()
  const deleted = page.waitForRequest(req => req.method() === 'DELETE' && req.url().endsWith('/datasets/jep-admin/lines/jep-2'))
  // the confirmation button of the menu, after the activator of the same name
  await page.getByRole('button', { name: 'Supprimer l\'événement' }).last().click()
  await deleted
})

test('dragging an event opens it in edit mode', async ({ page }) => {
  await openAdmin(page)
  const box = (await page.getByText('Visite du musée').boundingBox())!
  // start in the middle of the event (outside the resize zones), move horizontally and
  // vertically: hasDragged is only set when the mapped minute changes, and the end stays
  // on the dragged preview so that the trailing click does not open the creation menu
  await page.mouse.move(box.x + box.width / 2, box.y + 20)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + 40, { steps: 8 })
  await page.mouse.up()
  await expect(editTitle(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Valider' })).toBeVisible()
})

test.describe('opening hours', () => {
  test('an event with opening hours is edited with the opening hours editor', async ({ page }) => {
    const ds = datasets.openingAdmin
    await openApp(page, {
      dataset: ds,
      config: { ...openingConfig, initialView: 'timeGridWeek', datasets: [ds] },
      lines: [{ _id: 'oh-1', title: 'Atelier horaires', start: '2026-10-05T09:00:00+02:00', end: '2026-10-30T17:00:00+01:00', hours: 'Mo 09:00-17:00' }]
    })
    await page.getByText('Atelier horaires').click()
    await page.getByRole('button', { name: 'Modifier l\'événement' }).click()
    await expect(editTitle(page)).toBeVisible()
    await expect(page.getByText('Lundi')).toBeVisible()
    await expect(page.getByText('Dimanche')).toBeVisible()
  })
})

test.describe('extension fields', () => {
  // an extension column is computed by the platform from the other fields (a join here)
  const ds = {
    ...datasets.jepAdmin,
    schema: [...datasets.jepAdmin.schema!, { key: 'code_postal', type: 'string', title: 'Code postal', 'x-extension': 'ext-1' }]
  }
  const codePostalByCity: Record<string, string> = { Paris: '75000', Lyon: '69000' }
  const lines = jepLines.map(line => line._id === 'jep-2' ? { ...line, code_postal: '75000' } : line)

  test('are read-only, refreshed from the other fields and never saved', async ({ page }) => {
    await openApp(page, { dataset: ds, config: { ...weekConfig, datasets: [ds] }, lines })
    // registered after openApp on purpose: the last matching route wins
    await page.route('**/datasets/jep-admin/_simulate-extension', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({ json: { ...body, code_postal: codePostalByCity[String(body.location_city)] ?? '00000' } })
    })
    await page.getByText('Visite du musée').click()
    await page.getByRole('button', { name: 'Modifier l\'événement' }).click()
    await expect(editTitle(page)).toBeVisible()

    const codePostal = page.getByRole('textbox', { name: 'Code postal' })
    await expect(codePostal).toBeDisabled()
    // simulated from the line as soon as the form opens
    await expect(codePostal).toHaveValue('75000')

    await page.getByRole('textbox', { name: 'Commune' }).fill('Lyon')
    await expect(codePostal).toHaveValue('69000')

    await page.getByRole('textbox', { name: 'Titre' }).fill('Visite guidée')
    const saved = page.waitForRequest(req => req.method() === 'PUT' && req.url().endsWith('/lines/jep-2'))
    await page.getByRole('button', { name: 'Valider', exact: true }).click()
    const body = (await saved).postData() ?? ''
    expect(body).toContain('"title_fr":"Visite guidée"')
    expect(body).not.toContain('code_postal')
  })
})
