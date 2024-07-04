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
  console.log(colorSchemes)
  return colorSchemes
}
export async function getParams (dateBegin, dateEnd) {
  let url = `${dataUrl}/safe-schema?calculated=false`
  const request = await fetch(url)
  const reponse = await request.json()
  let startDate, endDate, evtDate
  reponse.forEach((value) => {
    if (value['x-concept'] !== undefined) {
      if (value['x-concept'].id === 'startDate') startDate = value.key
      else if (value['x-concept'].id === 'endDate') endDate = value.key
      else if (value['x-concept'].id === 'date') evtDate = value.key
    }
  }
  )
  const captureMonth = `[${dateBegin.getFullYear()}\\-${String(dateBegin.getMonth() + 1).padStart(2, '0')}\\-${String(dateBegin.getDate()).padStart(2, '0')} TO 
  ${dateEnd.getFullYear()}\\-${String(dateEnd.getMonth() + 1).padStart(2, '0')}\\-${String(dateEnd.getDate()).padStart(2, '0')}]`
  const beforeMonth = `[* TO ${dateBegin.getFullYear()}\\-${String(dateBegin.getMonth() + 1).padStart(2, '0')}\\-${String(dateBegin.getDate()).padStart(2, '0')}]`
  const afterMonth = `[${dateEnd.getFullYear()}\\-${String(dateEnd.getMonth() + 1).padStart(2, '0')}\\-${String(dateEnd.getDate()).padStart(2, '0')} TO *]`
  url = `${dataUrl}/lines?q_mode=complete&qs=(${startDate}:${captureMonth}) OR
  (${endDate}:${captureMonth}) OR
  (${startDate}:${beforeMonth} AND ${endDate}:${afterMonth})`
  const url2 = url.concat('&size=0')
  const request2 = await fetch(url2)
  let size = 100
  if (request2.ok) {
    const reponse = await request2.json()
    size = reponse.total
  }
  url = url.concat(`&size=${size}`)
  return { startDate, endDate, evtDate, url }
}
