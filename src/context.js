import useAppInfo from './composables/useAppInfo'
// import { getColor } from '@/assets/util.js'
import { useConceptFilters } from '@data-fair/lib/vue/concept-filters.js'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
import { ofetch } from 'ofetch'
import { ref, computed } from 'vue'

export const displayError = ref(false)
export const errorMessage = ref('')

const conceptFilters = useConceptFilters(reactiveSearchParams)
const { config, color, mainDataset, startDateField, endDateField, dateField, labelField, descriptionField, layout } = useAppInfo()

const period = computed(() => {
  const view = reactiveSearchParams.view
  if (view === 'dayGridMonth' || view === 'listMonth') {
    const start = new Date(reactiveSearchParams.start)
    start.setDate(1)
    const end = new Date(start.getTime() + 31 * 24 * 60 * 60 * 1000)
    return start.toISOString().slice(0, 10) + ',' + end.toISOString().slice(0, 10)
  } else if (view === 'timeGridWeek') {
    const start = new Date(reactiveSearchParams.start)
    start.setDate(start.getDate() - start.getUTCDay()) // go to monday
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
    return start.toISOString().slice(0, 10) + ',' + end.toISOString().slice(0, 10)
  }
  return reactiveSearchParams.start
})

function getColor (value, theme) {
  if (color.type === 'monochrome') {
    return color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
  } else {
    return '' // colorPalette[value]
  }
}

export async function getData (theme) {
  const params = {
    ...conceptFilters,
    _c_date_match: period.value,
    size: 10000,
    select: '_id,' + labelField
  }
  if (color.type === 'multicolor') params.select += ',' + config.color.field
  if (startDateField && endDateField) params.select += ',' + startDateField + ',' + endDateField
  else params.select += ',' + dateField
  const response = await ofetch(`${mainDataset.href}/lines`, { params })
  return response.results.map(event => ({
    editable: layout === 'admin',
    id: event._id,
    title: event[labelField],
    color: getColor(color.type === 'multicolor' && event[color.field], theme),
    start: event[startDateField && endDateField ? startDateField : dateField],
    end: startDateField && endDateField ? event[endDateField] : undefined,
    allDay: !(startDateField && endDateField) || (new Date(event[endDateField]).getTime() - new Date(event[startDateField]).getTime() > 2 * 24 * 60 * 60 * 1000)
  }))

  // if (config.crowdSourcing && layout !== 'simple') {
  //   const reponse = await ofetch(`${contribsDataset?.href}/lines?size=1000${layout === 'contrib' ? '&owner=' + application.owner.id : ''}`)
  //   const promises = reponse.results.map(async (contrib) => {
  //     if (contrib.validation_status === 'waiting') {
  //       const value = JSON.parse(contrib.update)
  //       const event = createEvent(value, colorPalette, theme, contrib)
  //       event.editable = layout === 'contrib' // admin cant drag or resize a contrib, he can only patch through edit button
  //       if (config.colorContrib.noContribColor) {
  //         event.color = config.colorContrib.hexValue
  //       } else {
  //         event[color.field] = value[color.field]
  //         if (!colorPalette[value[color.field]]) {
  //           // if this is a new category we need to recalculate the color Palette
  //           colorPalette = await getColor(value[color.field])
  //           event.color = colorPalette[value[color.field]]
  //         } else {
  //           event.color = colorPalette[value[color.field]]
  //         }
  //       }
  //       events.push(event)
  //     }
  //   })
  //   await Promise.all(promises)
  // }
  // return events
}

function createEvent (value, colorPalette, theme, contrib = undefined) {
  const event = {}
  event.id = value._id || contrib._id
  event.title = value[labelField] || ''
  if (value[startDateField]) { // timed-event
    event.start = value[startDateField]
    event.end = value[endDateField]
    const db = new Date(value[startDateField])
    const de = new Date(value[endDateField])
    if (Math.abs(de.getDate() - db.getDate()) > 2 || db.getMonth() !== de.getMonth()) {
      // if the timed event is more than 2 days long, we set the allDay property to true
      // but we may loose the information on start and end hours,
      // the format change from this : (YYY-MM-DD HH-mm) to (YYY-MM-DD 00:00), this is a full calendar functionnality
      event.allDay = true
    }
  } else event.start = value[dateField]
  if (contrib) {
    event.contrib = true
    event.comment = contrib.comment
    event.user_name = contrib.user_name
    event.className = 'contribution'
  } else {
    if (color.type === 'monochrome') {
      event.color = color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
    } else {
      event[color.field] = value[color.field]
      event.color = colorPalette[value[color.field]]
    }
    event.description = value[descriptionField] || ''
    for (const field of config.thumbnailFields) {
      event[field] = value[field]
    }
  }
  return event
}
