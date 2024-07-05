import useAppInfo from '@/composables/useAppInfo'
import chroma from 'chroma-js'
const { dataUrl, color } = useAppInfo()
export async function getColor () {
  const colorSchemes = {}
  if (color.colors.type === 'palette') {
    if (color.categoryField.enum) {
      const tabColor = color.categoryField.enum
      const nbColor = Math.max(tabColor.length, 12)
      const palette = chroma.scale(color.colors.name).mode('lch').colors(nbColor)
      tabColor.forEach((category, i) => {
        colorSchemes[category] = `${palette[i + color.colors.offset]}`
      })
    } else {
      const url = `${dataUrl}/values/${color.categoryField.key}?size=${color.categoryField['x-cardinality']}`
      const request = await fetch(url)
      if (request.ok) {
        const reponse = await request.json()
        const nbColor = Math.max(reponse.length, 12)
        const palette = chroma.scale(color.colors.name).mode('lch').colors(nbColor)
        reponse.forEach((category, i) => {
          colorSchemes[category] = `${palette[i + color.colors.offset]}`
        })
      }
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
  let startDate, endDate, evtDate, description
  reponse.forEach((value) => {
    if (value['x-concept'] !== undefined) {
      if (value['x-concept'].id === 'startDate') startDate = value.key
      else if (value['x-concept'].id === 'endDate') endDate = value.key
      else if (value['x-concept'].id === 'date') evtDate = value.key
      else if (value['x-concept'].id === 'description') description = value.key
    }
  })
  return { startDate, endDate, evtDate, description }
}
