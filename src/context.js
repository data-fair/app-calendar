import useAppInfo from './composables/useAppInfo'
import { getParams, getColor } from '@/assets/util.js'
const { label, color, dataUrl } = useAppInfo()
const { startDate, endDate, evtDate, description } = await getParams()
export async function getData (dateBegin, dateEnd, theme) {
  const events = []
  let url = `${dataUrl}/lines?_c_date_match=${Date.parse(dateBegin)},${Date.parse(dateEnd)}`
  const urlSize = url.concat('&size=0') // get the total of events to display
  let request = await fetch(urlSize).then(function (rep) { return rep.json() })
  const size = request.total
  url = url.concat(`&size=${size + 1}&html=true`)
  request = await fetch(url)
  if (request.ok) {
    const reponse = await request.json()
    const colors = color.type !== 'monochrome' ? await getColor() : undefined
    reponse.results.forEach(async (value) => {
      let event
      if (value[evtDate] !== undefined) { // event
        event = {
          id: value._i,
          title: value[label.key],
          start: value[evtDate]
        }
      } else { // period time event
        event = {
          id: value._i,
          title: value[label.key],
          start: value[startDate],
          end: value[endDate]
        }
        const db = new Date(value[startDate])
        const de = new Date(value[endDate])
        if (db.getDate() !== de.getDate() || db.getMonth() !== de.getMonth()) {
          event.allDay = true
        }
      }
      if (color.type === 'monochrome') {
        event.color = color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
      } else {
        event.color = colors[value[color.categoryField.key]]
      }
      if (value[description] !== undefined) event.description = value[description]
      events.push(event)
    })
  }
  return events
}
