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
  const endDateField = mainDataset.schema.find(f => f['x-refersTo'] === 'https://schema.org/endDate')?.key
  const dateField = mainDataset.schema.find(f => f['x-refersTo'] === 'http://schema.org/Date')?.key
  if ((!startDateField || !endDateField) && !dateField) throw new Error('Veuillez ajouter un concept de type Date à vos données')
  const color = config.color

  if (color.type === 'multicolor' && !config.color.field) throw new Error('Veuillez remplir le champ : colonne de catégorie')

  const userPermissions = mainDataset.userPermissions || []
  const isAdmin = userPermissions.includes('createLine') && userPermissions.includes('patchLine') && userPermissions.includes('deleteLine') && (!reactiveSearchParams.role || reactiveSearchParams.role !== 'contrib')

  const contribsDataset = config.datasets?.[1]
  if (config.crowdSourcing) {
    if (!contribsDataset) throw new Error('Veuillez sélectionner une source de données pour les contributions')
    const missingFields = ['operation', 'submit_date', 'user_name', 'target_id', 'comment', 'validation_status', 'validation_date', 'update', 'original'].filter(fid => !contribsDataset.schema.map(f => f.key).includes(fid))
    if (missingFields.length) throw new Error('Champs manquants dans le jeu de données des contributions : ' + missingFields.join(', '))
  }
  const layout = !config.crowdSourcing ? (mainDataset.isrest ? 'admin' : 'simple') : (isAdmin ? 'admin' : 'contrib')

  return {
    application,
    config,
    mainDataset,
    contribsDataset,
    startDateField,
    dateField,
    endDateField,
    labelField,
    descriptionField,
    isAdmin,
    color,
    layout
  }
}
