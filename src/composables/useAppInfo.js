import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'

export default function useAppInfo () {
  // @ts-ignore
  const application = /** @type {import('@data-fair/lib/shared/application.js').Application} */ (window.APPLICATION)
  const config = /** @type {import('../config/.type/types.js').Config} */ (application.configuration)
  if (!config) throw new Error('Il n\'y a pas de configuration définie')
  const mainDataset = config.datasets?.[0]
  if (!mainDataset) throw new Error('Veuillez sélectionner la source de données des évènements')
  const labelField = config.labelField?.key || mainDataset.schema.find(f => f['x-refersTo'] === 'http://www.w3.org/2000/01/rdf-schema#label')?.key
  if (!labelField) throw new Error('Veuillez remplir le champ libellé ou bien assignez le concept Libellé à l\'une de vos colonnes')
  const descriptionField = config.descriptionField?.key || mainDataset.schema.find(f => f['x-refersTo'] === 'http://schema.org/description')?.key
  const startDateField = mainDataset.schema.find(f => f['x-refersTo'] === 'https://schema.org/startDate')?.key
  const startDateType = mainDataset.schema.find(f => f['x-refersTo'] === 'https://schema.org/startDate')?.format
  const endDateField = mainDataset.schema.find(f => f['x-refersTo'] === 'https://schema.org/endDate')?.key
  const endDateType = mainDataset.schema.find(f => f['x-refersTo'] === 'https://schema.org/endDate')?.format
  const dateField = mainDataset.schema.find(f => f['x-refersTo'] === 'http://schema.org/Date')?.key
  const dateType = mainDataset.schema.find(f => f['x-refersTo'] === 'http://schema.org/Date')?.format
  if ((!startDateField || !endDateField) && !dateField) throw new Error('Veuillez ajouter un concept de type Date à vos données')
  const attachmentField = !mainDataset.attachmentsAsImage && mainDataset.schema.find(f => f['x-refersTo'] === 'http://schema.org/DigitalDocument')
  const imageField = mainDataset.schema.find(f => f['x-refersTo'] === 'http://schema.org/image')?.key
  const linkField = mainDataset.schema.find(f => f['x-refersTo'] === 'https://schema.org/WebPage')?.key
  const fields = mainDataset.schema.reduce((a, b) => { a[b.key] = b; return a }, {})

  const color = config.color
  if (color?.type === 'multicolor' && !config.color.field) throw new Error('Veuillez remplir le champ : colonne de catégorie')

  const userPermissions = mainDataset.userPermissions || []
  const isAdmin = userPermissions.includes('readLines') && userPermissions.includes('createLine') && userPermissions.includes('updateLine') && userPermissions.includes('patchLine') && userPermissions.includes('deleteLine') && (!reactiveSearchParams.role || reactiveSearchParams.role === 'admin')

  const layout = mainDataset.isRest && isAdmin ? 'admin' : 'simple'

  return {
    application,
    config,
    mainDataset,
    startDateField,
    startDateType,
    dateField,
    dateType,
    endDateField,
    endDateType,
    labelField,
    descriptionField,
    attachmentField,
    linkField,
    imageField,
    fields,
    isAdmin,
    color,
    layout
  }
}
