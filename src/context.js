import useAppInfo from './composables/useAppInfo'
import { getColor } from '@/assets/util.js'
import { useConceptFilters } from '@data-fair/lib/vue/concept-filters.js'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
import { ofetch } from 'ofetch'
import { ref } from 'vue'

const conceptFilters = useConceptFilters(reactiveSearchParams)

const { color, dataUrl, thumbnailFields, startDate, endDate, evtDate, label, description, category, crowdSourcing, layout, contribUrl } = useAppInfo()
export const displayError = ref(false)
export const errorMessage = ref('')
export async function getData (dateBegin, dateEnd, theme) {
  if (!evtDate && !startDate && !endDate) throw new Error('Ajoutez au moins un concept de type Date à vos données')
  if (!label) throw new Error('Veuillez remplir le champ libellé ou bien assignez le concept Libellé à l\'une de vos colonnes')
  const events = []
  const url = `${dataUrl}/lines`
  const urlSize = url.concat('?size=0') // get the total of events to display
  const params = {
    ...conceptFilters,
    _c_date_match: `${Date.parse(dateBegin)},${Date.parse(dateEnd)}`,
    size: 0,
    html: true
  }
  const requestSize = await ofetch(urlSize, { params })
  params.size = requestSize.total + 1
  const reponse = await ofetch(url, { params })
  let colors
  if (color.type === 'multicolor') {
    if (!category) throw new Error('Veuillez remplir le champ : colonne de catégorie')
    else {
      colors = await getColor()
    }
  }
  reponse.results.forEach(async (value) => {
    const event = transformEvent(value, colors, theme)
    if (layout === 'edit') event.editable = false
    events.push(event)
  })
  if (crowdSourcing) {
    if (layout === 'edit') {
      //
    } else { // display everything
      const reponse = await ofetch(contribUrl + '/lines')
      reponse.results.forEach((contrib) => {
        if (contrib.validation_status !== 'validated') {
          const event = transformEvent(JSON.parse(contrib.update), [], null, contrib)
          event.id = contrib.target_id || contrib._id
          if (contrib.operation === 'delete') event.target_id = contrib._id
          events.push(event)
        }
      })
    }
  }
  return events
}

function transformEvent (value, colors, theme, contrib = undefined) {
  let event
  if (value[evtDate]) { // event
    event = {
      id: value._id,
      title: !label ? '' : value[label],
      start: value[evtDate]
    }
  } else { // timed event
    event = {
      id: value._id,
      title: !label ? '' : value[label],
      start: value[startDate],
      end: value[endDate]
    }
    const db = new Date(value[startDate])
    const de = new Date(value[endDate])
    if (Math.abs(de.getDate() - db.getDate()) > 2 || db.getMonth() !== de.getMonth()) {
      // if the timed event is more than 2 days long, we set the allDay property to true
      // but we may loose the information on start and end hours,
      // the format change from this : (YYY-MM-DD HH-mm) to (YYY-MM-DD 00:00), this is a full calendar functionnality
      event.allDay = true
    }
  }
  if (contrib) {
    event.contrib = true
    event.editable = false
    event.operation = contrib.operation
    event.comment = contrib.comment
    event.user_name = contrib.user_name
    if (contrib.operation === 'create') event.color = '#66bd6d'
    if (contrib.operation === 'delete') event.color = '#f44336'
    if (contrib.operation === 'update') event.color = '#f7e17e'
  } else {
    if (color.type === 'monochrome') {
      event.color = color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
    } else {
      event[category] = value[category]
      event.color = colors[value[category]]
    }
    event.description = !description ? '' : value[description]
    for (const field of thumbnailFields) {
      event[field] = value[field]
    }
  }
  return event
}
