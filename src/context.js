import useAppInfo from './composables/useAppInfo'
import { useConceptFilters } from '@data-fair/lib/vue/concept-filters.js'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
import { ofetch } from 'ofetch'
import { ref } from 'vue'
import { computedAsync } from '@vueuse/core'
import chroma from 'chroma-js'

export const displayError = ref(false)
export const errorMessage = ref('')
export const timestamp = ref(new Date().getTime())

const conceptFilters = useConceptFilters(reactiveSearchParams)
const { config, color, mainDataset, contribsDataset, startDateField, endDateField, dateField, labelField, layout } = useAppInfo()

const colorPalette = computedAsync(async () => {
  if (color.colors.type !== 'multicolor') return
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

function getColor (value, theme) {
  if (color.type === 'monochrome') {
    return color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
  } else {
    return colorPalette.value[value]
  }
}

export async function getData (theme, session) {
  if (!reactiveSearchParams.start && !reactiveSearchParams.end) return []
  const params = {
    ...conceptFilters,
    _c_date_match: reactiveSearchParams.start + ',' + reactiveSearchParams.end,
    size: 1000,
    select: '_id,' + labelField
  }
  if (layout !== 'simple') params.t = timestamp.value
  else params.finalizedAt = mainDataset.finalizedAt
  if (color.type === 'multicolor') params.select += ',' + config.color.field
  if (startDateField && endDateField) params.select += ',' + startDateField + ',' + endDateField
  else params.select += ',' + dateField
  const response = await ofetch(`${mainDataset.href}/lines`, { params })
  const mainEvents = response.results.map(event => ({
    editable: layout === 'admin',
    id: event._id,
    title: event[labelField],
    color: getColor(color.type === 'multicolor' && event[color.field], theme),
    start: event[startDateField && endDateField ? startDateField : dateField],
    end: startDateField && endDateField ? event[endDateField] : undefined,
    allDay: !(startDateField && endDateField) || (new Date(event[endDateField]).getTime() - new Date(event[startDateField]).getTime() > 2 * 24 * 60 * 60 * 1000)
  }))
  if (config.crowdSourcing && layout !== 'simple') {
    const params = {
      _c_date_match: reactiveSearchParams.start + ',' + reactiveSearchParams.end,
      size: 1000,
      t: timestamp.value
    }
    const response = await ofetch(`${contribsDataset.href + (layout === 'contrib' ? `/own/user:${session?.state?.user?.id}` : '')}/lines`, { params })
    const contribEvents = response.results.map(event => {
      const payload = JSON.parse(event.payload || '{}')
      return {
        editable: layout === 'contrib',
        isContrib: true,
        operation: event.operation,
        status: event.status,
        _owner: event._owner,
        _ownerName: event._ownerName,
        id: event._id,
        payload,
        title: payload[labelField],
        color: config.colorContrib,
        start: event.start,
        end: event.end,
        allDay: !(startDateField && endDateField) || (new Date(event.end).getTime() - new Date(event.start).getTime() > 2 * 24 * 60 * 60 * 1000)
      }
    })
    return [...mainEvents, ...contribEvents]
  } else return mainEvents
}
