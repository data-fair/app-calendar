import useAppInfo from '@/composables/useAppInfo'
import chroma from 'chroma-js'
const { dataUrl, color, category, editionFields, label } = useAppInfo()
const categorySet = new Set()
export async function getColor (newCategory) {
  const colorSchemes = {} // create an object who associates a category and a color
  if (color.colors.type === 'palette') {
    const url = `${dataUrl}/values/${category}?size=100`
    const request = await fetch(url)
    if (request.ok) {
      const reponse = await request.json()
      if (newCategory) categorySet.add(newCategory)
      const nbColor = Math.max(reponse.length, 12)
      const palette = chroma.scale(color.colors.name).mode('lch').colors(nbColor)
      reponse.forEach((cat) => {
        categorySet.add(cat)
      })
      let i = 0
      categorySet.forEach((cat) => {
        colorSchemes[cat] = `${palette[i + color.colors.offset]}`
        i++
      })
    }
  } else {
    color.colors.styles.forEach((cat) => {
      colorSchemes[cat.value] = `${cat.color}`
    })
  }
  return colorSchemes
}
export async function getSchema () {
  const url = `${dataUrl}/safe-schema?calculated=false&mimeType=application%2Fschema%2Bjson`
  const request = await fetch(url)
  const reponse = await request.json()
  const schema = { // vjsf form schema
    type: 'object',
    required: [],
    properties: {}
  }
  if (label) {
    if (reponse.properties[label].title === '') reponse.properties[label].title = reponse.properties[label].key
    schema.properties[label] = reponse.properties[label]
  }
  editionFields.forEach(f => {
    if (reponse.properties[f.field.key].title === '') reponse.properties[f.field.key].title = reponse.properties[f.field.key].key
    schema.properties[f.field.key] = reponse.properties[f.field.key]
  })
  return { schema }
}

export const formatDate = date => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}` // get format like YYYY-MM-DD
export const formatHours = date => date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0') // get format like 'HH:MM'
