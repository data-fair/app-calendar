import useAppInfo from '@/composables/useAppInfo'
import chroma from 'chroma-js'
const { dataUrl, color, categoryField, descriptionField, labelField } = useAppInfo()
const categorySet = new Set()
export async function getColor (newCategory) {
  const colorSchemes = {}
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
  const url = `${dataUrl}/safe-schema?calculated=false`
  const request = await fetch(url)
  const reponse = await request.json()
  let startDate, endDate, evtDate
  let label = labelField?.key
  let description = descriptionField?.key
  const category = categoryField?.key
  const keys = []
  reponse.forEach((value) => {
    keys.push(value.key)
    if (value['x-concept'] !== undefined) {
      if (value['x-concept'].id === 'startDate') startDate = value.key
      else if (value['x-concept'].id === 'endDate') endDate = value.key
      else if (value['x-concept'].id === 'date') evtDate = value.key
      else if (value['x-concept'].id === 'label' && !labelField) label = value.key
      else if (value['x-concept'].id === 'description' && !descriptionField) description = value.key
    }
  })
  return { startDate, endDate, evtDate, label, description, category }
}
