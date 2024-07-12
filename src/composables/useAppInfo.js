export default function useAppInfo () {
  // @ts-ignore
  const application = /** @type {import('@data-fair/lib/shared/application.js').Application} */ (window.APPLICATION)
  const config = /** @type {import('../config/.type/types.js').Config} */ (application.configuration)
  if (!config) throw new Error('Il n\'y a pas de configuration définie')
  const dataset = config.datasets?.[0]
  if (!dataset) throw new Error('Veuillez sélectionner une source de données')
  const dataUrl = config.datasets[0].href
  const isRest = config.datasets[0].isRest
  const screenSize = window.innerHeight
  const labelField = config.datasets[1].labelField
  const categoryField = config.datasets[1].categoryField
  const descriptionField = config.datasets[1].descriptionField
  const color = config.datasets[2].color
  const additionalFields = config.additionalFields
  return {
    dataUrl,
    isRest,
    screenSize,
    labelField,
    categoryField,
    descriptionField,
    color,
    additionalFields
  }
}
