import useAppInfo from './composables/useAppInfo'
import { useConceptFilters } from '@data-fair/lib/vue/concept-filters.js'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
import { ofetch } from 'ofetch'
import { ref } from 'vue'
import { computedAsync } from '@vueuse/core'
import chroma from 'chroma-js'
import { errorMessage, displayError } from '@/messages'

export const timestamp = ref(new Date().getTime())

const { config, color, mainDataset, startDateField, endDateField, dateField, labelField, layout } = useAppInfo()
const conceptFilters = useConceptFilters(reactiveSearchParams, mainDataset?.id)

export const colorPalette = computedAsync(async () => {
  if (color?.type !== 'multicolor') return
  const palette = {} // create an object who associates a category and a color
  if (color.colors.type === 'palette') {
    const categories = await ofetch(`${mainDataset.href}/values/${color.field}?size=100`)
    const nbColors = Math.max(categories.length, 12)
    const cPalette = chroma.scale(color.colors.name).mode('lch').colors(nbColors)
    categories.forEach((cat, i) => {
      palette[cat] = cPalette[(i + color.colors.offset) % nbColors]
    })
  } else {
    color.colors.categories.forEach((cat) => {
      palette[cat.value] = `${cat.color}`
    })
  }
  return palette
}, null, {
  onError: function (e) {
    displayError.value = true
    errorMessage.value = e.message
  }
})

export const events = computedAsync(async () => {
  if (!reactiveSearchParams.start && !reactiveSearchParams.end) return []
  const params = {
    ...conceptFilters,
    _c_date_match: reactiveSearchParams.start + ',' + reactiveSearchParams.end,
    size: 1000,
    select: '_id,' + labelField
  }
  if (layout !== 'simple') params.t = timestamp.value
  else params.finalizedAt = mainDataset.finalizedAt
  if (color?.type === 'multicolor') params.select += ',' + config.color.field
  if (startDateField && endDateField) params.select += ',' + startDateField + ',' + endDateField
  else params.select += ',' + dateField
  const response = await ofetch(`${mainDataset.href}/lines`, { params })
  return response.results.map(event => ({
    editable: layout === 'admin',
    id: event._id,
    title: event[labelField],
    colorFieldValue: color?.type === 'multicolor' && event[config.color.field],
    start: event[startDateField && endDateField ? startDateField : dateField],
    end: startDateField && endDateField ? event[endDateField] : undefined,
    allDay: !(startDateField && endDateField) || (new Date(event[endDateField]).getTime() - new Date(event[startDateField]).getTime() > 2 * 24 * 60 * 60 * 1000)
  }))
}, null, {
  onError: function (e) {
    displayError.value = true
    errorMessage.value = e.message
  }
})
