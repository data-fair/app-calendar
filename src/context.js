import useAppInfo from './composables/useAppInfo'
import { useConceptFilters } from '@data-fair/lib-vue/concept-filters.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import { ofetch } from 'ofetch'
import { ref } from 'vue'
import { computedAsync } from '@vueuse/core'
import chroma from 'chroma-js'
import { errorMessage, displayError } from '@/messages'
import { getDailyOpeningHours } from '@wojtekmaj/opening-hours-utils'
import { getLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'

export const timestamp = ref(new Date().getTime())

const { config, color, mainDataset, startDateField, endDateField, dateField, labelField, openingHoursField, layout, startDateType, endDateType } = useAppInfo()
const conceptFilters = useConceptFilters(reactiveSearchParams, mainDataset?.id)
const { dayjs } = getLocaleDayjs()

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
  if (openingHoursField) params.select += ',' + openingHoursField
  const response = await ofetch(`${mainDataset.href}/lines`, { params })
  return [].concat(...response.results.map(event => {
    const baseEvent = {
      editable: layout === 'admin',
      id: event._id,
      originalId: event._id,
      title: event[labelField],
      colorFieldValue: color?.type === 'multicolor' && event[config.color.field]
    }
    if (openingHoursField && event[openingHoursField]) {
      const openingHours = Object.assign({}, ...getDailyOpeningHours(event[openingHoursField]).map(oh => ({
        [{
          Mo: 'lu',
          Tu: 'ma',
          We: 'me',
          Th: 'je',
          Fr: 've',
          Sa: 'sa',
          Su: 'di'
        }[oh.day]]: oh.hours.map(h => ({ from: h.from.split(':'), to: h.to.split(':') }))
      })))
      console.log(event, openingHours)
      let start = dayjs(reactiveSearchParams.start.localeCompare(event[startDateField]) > 0 ? reactiveSearchParams.start : event[startDateField])
      const end = dayjs(reactiveSearchParams.end.localeCompare(event[endDateField]) < 0 ? reactiveSearchParams.end : event[endDateField])
      const evts = []
      try {
        while (!start.isAfter(end)) {
          const hours = openingHours[start.format('dd')]
          if (hours) {
            if (reactiveSearchParams.view === 'dayGridMonth') {
              evts.push({
                ...baseEvent,
                id: start.toISOString() + baseEvent.id,
                start: start.hour(hours[0].from[0]).minute(hours[0].from[1]).toISOString(),
                end: start.hour(hours[hours.length - 1].to[0]).minute(hours[hours.length - 1].to[1]).toISOString(),
                allDay: false
              })
              start = start.add(1, 'day').hour(0).minute(0)
              console.log(start.toISOString())
            } else {
              const next = hours.find(h => h.from.localeCompare(start.format('HH:mm')) >= 0)
              if (next) {
                // ds
              }
              start = start.add(1, 'day')
            }

            // console.log(start.format('dd'), start.format('HH:mm'), next, hours)
          } else start = start.add(1, 'day')
        }
      } catch (err) {
        console.log(err)
      }
      console.log(evts)
      // console.log(reactiveSearchParams.start.localeCompare(event[startDateField]))
      // console.log(reactiveSearchParams.start, event[startDateField])
      // dayjs(reactiveSearchParams.start), dayjs(event[startDateField])
      // try {
      //   dayjsModule.setBusinessTime(businessOurs)
      //   const start = dayjsModule.max()
      //   console.log(start)

      //   console.log(dayjsModule(reactiveSearchParams.start).nextBusinessTime())
      // } catch (err) {
      //   console.log(err)
      // }

      // oh.forEach(day => {
      //   day.hours.forEach(hours => {

      //   })
      // })
      return evts
    } else {
      return [{
        ...baseEvent,
        start: event[startDateField && endDateField ? startDateField : dateField],
        end: startDateField && endDateField ? event[endDateField] : undefined,
        allDay: !(startDateField && endDateField) || (startDateType === 'date' && endDateType === 'date') || (new Date(event[endDateField]).getTime() - new Date(event[startDateField]).getTime() > 2 * 24 * 60 * 60 * 1000)
      }]
    }
  }))
}, null, {
  onError: function (e) {
    displayError.value = true
    errorMessage.value = e.message
  }
})
