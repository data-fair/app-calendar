export default function useAppInfo () {
  // @ts-ignore
  const application = /** @type {import('@data-fair/lib/shared/application.js').Application} */ (window.APPLICATION)
  const config = /** @type {import('../config/.type/types.js').Config} */ (application.configuration)
  if (!config) throw new Error('Il n\'y a pas de configuration définie')
  const dataset = config.datasets?.[0]
  if (!dataset) throw new Error('Veuillez sélectionner une source de données')
  dataset.href = dataset.href.replace('fairapi', 'fair/api')
  const dataUrl = config.datasets[0].href
  const screenSize = window.innerHeight
  const datasetId = config.datasets[0].id
  const color = config.datasets[2].color
  const label = config.datasets[1].labelsField
  return {
    color,
    dataUrl,
    datasetId,
    dataset,
    screenSize,
    label
  }
}
