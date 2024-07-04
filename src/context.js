import useAppInfo from './composables/useAppInfo'
import { getParams, getColor } from '@/assets/util.js'
const { label, color } = useAppInfo()
export async function getData (dateBegin, dateEnd, theme) {
  const events = []
  const { startDate, endDate, evtDate, url } = await getParams(dateBegin, dateEnd)
  const request = await fetch(url)
  if (request.ok) {
    const reponse = await request.json()
    if (color.type === 'monochrome') {
      reponse.results.forEach((value) => {
        let event
        if (value[evtDate] !== undefined) {
          event = {
            id: value._i,
            title: value[label.key],
            start: value[evtDate],
            color: color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue],
            allDay: true
          }
        } else {
          event = {
            id: value._i,
            title: value[label.key],
            start: value[startDate],
            end: value[endDate],
            color: color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
          }
          const db = new Date(value[startDate])
          const de = new Date(value[endDate])
          if (db.getDate() !== de.getDate() || db.getMonth() !== de.getMonth()) {
            event.allDay = true
          }
        }
        events.push(event)
      })
    } else {
      const colors = await getColor()
      reponse.results.forEach((value) => {
        let event
        if (value[evtDate] !== undefined) {
          event = {
            id: value._i,
            title: value[label.key],
            start: value[evtDate],
            color: colors[value[color.categoryField.key]],
            allday: true
          }
        } else {
          event = {
            id: value._i,
            title: value[label.key],
            start: value[startDate],
            end: value[endDate],
            color: colors[value[color.categoryField.key]]
          }
          const db = new Date(value[startDate])
          const de = new Date(value[endDate])
          if (db.getDate() !== de.getDate() || db.getMonth() !== de.getMonth()) {
            event.allDay = true
          }
        }
        events.push(event)
      })
    }
  }
  return events
}
