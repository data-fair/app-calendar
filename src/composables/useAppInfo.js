export default function useAppInfo () {
  // @ts-ignore
  const application = /** @type {import('@data-fair/lib/shared/application.js').Application} */ (window.APPLICATION)
  const config = /** @type {import('../config/.type/types.js').Config} */ (application.configuration)
  if (!config) throw new Error('Il n\'y a pas de configuration définie')
  const datasets = config.datasets
  if (!datasets[0]) throw new Error('Veuillez sélectionner une source de données')
  const label = config.labelField?.key || datasets[0].schema.find(f => f['x-refersTo'] === 'http://www.w3.org/2000/01/rdf-schema#label')?.key
  const description = config.descriptionField?.key || datasets[0].schema.find(f => f['x-refersTo'] === 'http://schema.org/description')?.key
  const startDate = datasets[0].schema.find(f => f['x-refersTo'] === 'https://schema.org/startDate')?.key
  const endDate = datasets[0].schema.find(f => f['x-refersTo'] === 'https://schema.org/endDate')?.key
  const evtDate = datasets[0].schema.find(f => f['x-refersTo'] === 'http://schema.org/Date')?.key
  if (!startDate && !endDate && !evtDate) throw new Error('Veuillez ajouter un concept de type Date à vos données')
  const dataUrl = config.datasets[0].href
  const isRest = config.datasets[0].isRest
  const screenSize = window.innerHeight
  const category = config.color.categoryField?.key
  const color = config.color
  const editionFields = config.editionFields
  const thumbnailFields = config.thumbnailFields
  const contribsDataset = config.contribution
  const contribUrl = contribsDataset?.href
  const crowdSourcing = config.crowdSourcing
  const owner = application.owner
  if (crowdSourcing) {
    const missingFields = ['operation', 'submit_date', 'user_name', 'target_id', 'comment', 'validation_status', 'validation_date', 'update', 'original'].filter(fid => !contribsDataset?.schema.map(f => f.key).includes(fid))
    if (missingFields.length) throw new Error('Champs manquants dans le jeu de données des contributions : ' + missingFields.join(', '))
  }
  const layoutType = {
    'simple-c': 'simple',
    'simple-cud': 'edit',
    advanced: 'admin'
  }
  const layout = layoutType[config.contribMode] || 'admin'
  return {
    startDate,
    evtDate,
    endDate,
    dataUrl,
    datasets,
    isRest,
    screenSize,
    label,
    category,
    description,
    color,
    thumbnailFields,
    editionFields,
    contribsDataset,
    layout,
    crowdSourcing,
    contribUrl,
    owner
  }
}
