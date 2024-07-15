import useAppInfo from '@/composables/useAppInfo'
import chroma from 'chroma-js'
const { dataUrl, color, categoryField, descriptionField, labelField, additionalFields } = useAppInfo()
const categorySet = new Set()
export async function getColor (newCategory) {
  const colorSchemes = {} // create an object who associates a category and a color
  if (color.colors.type === 'palette') {
    const url = `${dataUrl}/values/${categoryField.key}?size=100`
    const request = await fetch(url)
    if (request.ok) {
      const reponse = await request.json()
      if (newCategory) categorySet.add(newCategory)
      const nbColor = Math.max(reponse.length, 12)
      const palette = chroma.scale(color.colors.name).mode('lch').colors(nbColor)
      reponse.forEach((category) => {
        categorySet.add(category)
      })
      let i = 0
      categorySet.forEach((cat) => {
        colorSchemes[cat] = `${palette[i + color.colors.offset]}`
        i++
      })
    }
  } else {
    color.colors.styles.forEach((category) => {
      colorSchemes[category.value] = `${category.color}`
    })
  }
  return colorSchemes
}
export async function getParams () {
  const url = `${dataUrl}/safe-schema?calculated=false&mimeType=application%2Fschema%2Bjson`
  const request = await fetch(url)
  const reponse = await request.json()
  let startDate, endDate, evtDate
  let label = labelField?.key
  let description = descriptionField?.key
  const category = categoryField?.key
  const additionalParams = {
    type: 'object',
    required: [],
    properties: {}
  } // vjsf form params
  for (const field in reponse.properties) {
    if (reponse.properties[field].title === '') reponse.properties[field].title = reponse.properties[field].key // fill the title field to improve the display in the vjsf form
    if (reponse.properties[field]['x-concept'] !== undefined) {
      if (reponse.properties[field]['x-concept'].id === 'startDate') startDate = field
      else if (reponse.properties[field]['x-concept'].id === 'endDate') endDate = field
      else if (reponse.properties[field]['x-concept'].id === 'date') evtDate = field
      else if (reponse.properties[field]['x-concept'].id === 'label' && !labelField) label = field
      else if (reponse.properties[field]['x-concept'].id === 'description' && !descriptionField) description = field
    }
  }
  if (label) additionalParams.properties[label] = reponse.properties[label]
  if (category) additionalParams.properties[category] = reponse.properties[category]
  if (description) additionalParams.properties[description] = reponse.properties[description]
  additionalFields?.forEach((f) => {
    additionalParams.properties[f.field.key] = reponse.properties[f.field.key]
  })
  return { startDate, endDate, evtDate, label, description, category, additionalParams }
}

export const formatDate = date => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}` // get format like YYYY-MM-DD
export const formatHours = date => date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0') // get format like 'HH:MM'
