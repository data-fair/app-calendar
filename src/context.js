import useAppInfo from './composables/useAppInfo'
import { getColor } from '@/assets/util.js'
import { useConceptFilters } from '@data-fair/lib/vue/concept-filters.js'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
import { ofetch } from 'ofetch'
import { ref } from 'vue'

const conceptFilters = useConceptFilters(reactiveSearchParams)

const { color, dataUrl, thumbnailFields, startDate, endDate, evtDate, label, description, category, crowdSourcing, layout, contribUrl, user, colorContrib } = useAppInfo()
export const displayError = ref(false)
export const errorMessage = ref('')

export async function getData (dateBegin, dateEnd, theme) {
  if (!evtDate && !startDate && !endDate) throw new Error('Ajoutez au moins un concept de type Date à vos données')
  if (!label) throw new Error('Veuillez remplir le champ libellé ou bien assignez le concept Libellé à l\'une de vos colonnes')
  const events = []
  const params = {
    ...conceptFilters,
    _c_date_match: `${Date.parse(dateBegin)},${Date.parse(dateEnd)}`,
    size: 0,
    html: true
  }
  const requestSize = await ofetch(`${dataUrl}/lines`, { params })
  params.size = requestSize.total + 1
  const reponse = await ofetch(`${dataUrl}/lines`, { params })
  let colorPalette
  if (color.type === 'multicolor') {
    if (!category) throw new Error('Veuillez remplir le champ : colonne de catégorie')
    else {
      colorPalette = await getColor()
    }
  }
  reponse.results.forEach((value) => {
    const event = createEvent(value, colorPalette, theme)
    if (layout !== 'admin') event.editable = false
    events.push(event)
  })
  if (crowdSourcing && layout !== 'simple') {
    const reponse = await ofetch(`${contribUrl}/lines?size=1000${layout === 'edit' ? '&owner=' + user.id : ''}`)
    const promises = reponse.results.map(async (contrib) => {
      if (contrib.validation_status === 'waiting') {
        const value = JSON.parse(contrib.update)
        const event = createEvent(value, colorPalette, theme, contrib)
        event.editable = layout === 'edit' // admin cant drag or resize a contrib, he can only patch through edit button
        if (colorContrib.noContribColor) {
          event.color = colorContrib.hexValue
        } else {
          event[category] = value[category]
          if (!colorPalette[value[category]]) {
            // if this is a new category we need to recalculate the color Palette
            colorPalette = await getColor(value[category])
            event.color = colorPalette[value[category]]
          } else {
            event.color = colorPalette[value[category]]
          }
        }
        events.push(event)
      }
    })
    await Promise.all(promises)
  }
  return events
}

function createEvent (value, colorPalette, theme, contrib = undefined) {
  const event = {}
  event.id = value._id || contrib._id
  event.title = value[label] || ''
  if (value[startDate]) { // timed-event
    event.start = value[startDate]
    event.end = value[endDate]
    const db = new Date(value[startDate])
    const de = new Date(value[endDate])
    if (Math.abs(de.getDate() - db.getDate()) > 2 || db.getMonth() !== de.getMonth()) {
      // if the timed event is more than 2 days long, we set the allDay property to true
      // but we may loose the information on start and end hours,
      // the format change from this : (YYY-MM-DD HH-mm) to (YYY-MM-DD 00:00), this is a full calendar functionnality
      event.allDay = true
    }
  } else event.start = value[evtDate]
  if (contrib) {
    event.contrib = true
    event.comment = contrib.comment
    event.user_name = contrib.user_name
    event.className = 'contribution'
  } else {
    if (color.type === 'monochrome') {
      event.color = color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
    } else {
      event[category] = value[category]
      event.color = colorPalette[value[category]]
    }
    event.description = value[description] || ''
    for (const field of thumbnailFields) {
      event[field] = value[field]
    }
  }
  return event
}
