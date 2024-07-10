import useAppInfo from './composables/useAppInfo'
import { getParams, getColor } from '@/assets/util.js'
const { color, dataUrl } = useAppInfo()
const { startDate, endDate, evtDate, label, description, category } = await getParams()

export async function getData (dateBegin, dateEnd, theme) {
  if (!evtDate && !startDate && !endDate) throw new Error('Ajoutez au moins un concept de type Date à vos données')
  if (!label) throw new Error('Veuillez remplir le champ libellé ou bien assignez le concept Libellé à l\'une de vos colonnes')
  const events = []
  let url = `${dataUrl}/lines?_c_date_match=${Date.parse(dateBegin)},${Date.parse(dateEnd)}`
  const urlSize = url.concat('&size=0') // get the total of events to display
  let request = await fetch(urlSize).then(function (rep) { return rep.json() })
  const size = request.total
  url = url.concat(`&size=${size + 1}&html=true`)
  request = await fetch(url)
  if (request.ok) {
    const reponse = await request.json()
    let colors
    if (color.type === 'multicolor') {
      if (!category) throw new Error('Veuillez remplir le champ : colonne de catégorie')
      else {
        colors = await getColor()
      }
    }
    reponse.results.forEach(async (value) => {
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
          // but we may loose the information on start and end hours, the format change from this : (YYY-MM-DD HH-MM) to (YYY-MM-DD 00:00)
          event.allDay = true
        }
      }
      if (color.type === 'monochrome') {
        event.color = color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
      } else {
        event.category = value[category]
        event.color = colors[value[category]]
      }
      event.description = !description ? '' : value[description]
      events.push(event)
    })
  }
  return events
}
