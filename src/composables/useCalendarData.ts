import { useConfig } from './config'
import { getConceptFilters } from '@data-fair/lib-vue/concept-filters.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import type { QueryObject } from 'ufo'
import { useFetch } from '@data-fair/lib-vue/fetch'
import { ref, computed, watch } from 'vue'
import { useDebounce } from '@vueuse/core'
import chroma from 'chroma-js'
import { useUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { getDailyOpeningHours } from '@wojtekmaj/opening-hours-utils'
import { getLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import { filters2qs } from '@data-fair/lib-utils/filters'

function normalizeFilters (filters: any[]) {
  return filters.map(f => {
    if (!f) return f
    if (typeof f.field === 'string') return { ...f, field: { key: f.field } }
    return f
  })
}

export const timestamp = ref(new Date().getTime())

export function useCalendarData () {
  const { config, color, dataset: mainDataset, startDateField, endDateField, dateField, labelField, openingHoursField, layout, startDateType, endDateType } = useConfig()
  const { dayjs } = getLocaleDayjs()
  const { sendUiNotif } = useUiNotif()

  const { data: categoriesData, error: categoriesError } = useFetch(
    computed(() => color.value?.type === 'multicolor' && color.value?.field
      ? `${mainDataset.value?.href}/values/${color.value.field}?size=100`
      : null
    ),
    {
      query: computed(() => layout.value !== 'simple'
        ? { t: timestamp.value }
        : { finalizedAt: mainDataset.value?.finalizedAt }
      )
    }
  )

  const colorPalette = computed(() => {
    if (color.value?.type !== 'multicolor') return null
    const palette: Record<string, string> = {}
    if (!color.value?.colors) return null
    const colors = color.value.colors

    if (colors.type === 'palette') {
      const categories = (categoriesData.value as unknown as string[]) || []
      const nbColors = Math.max(categories.length, 12)
      const cPalette = chroma.scale(colors.name).mode('lch').colors(nbColors)
      categories.forEach((cat, i) => {
        palette[cat] = cPalette[(i + (colors.offset ?? 0)) % nbColors]
      })
    } else {
      colors.categories.forEach((cat: { value: string; color?: string }) => {
        palette[cat.value] = `${cat.color}`
      })
    }
    return palette
  })
  watch(categoriesError, (e) => {
    if (e) sendUiNotif({ type: 'error', msg: 'Erreur lors du chargement des couleurs', error: e })
  })

  const eventsQueryRaw = computed(() => {
    if (!reactiveSearchParams.start || !reactiveSearchParams.end) return {}
    const params: Record<string, unknown> = {
      ...getConceptFilters(reactiveSearchParams, mainDataset.value?.id),
      _c_date_match: decodeURIComponent(reactiveSearchParams.start) + ',' + decodeURIComponent(reactiveSearchParams.end),
      size: 1000,
      select: '_id,' + labelField.value
    }
    if (layout.value !== 'simple') params.t = timestamp.value
    else params.finalizedAt = mainDataset.value?.finalizedAt
    const staticFilters = config.value.staticFilters
    if (staticFilters?.length) {
      params.qs = filters2qs(normalizeFilters(staticFilters) as any)
    }
    if (color.value?.type === 'multicolor') params.select += ',' + color.value.field
    if (startDateField.value && endDateField.value) params.select += ',' + startDateField.value + ',' + endDateField.value
    else if (startDateField.value) params.select += ',' + startDateField.value
    else if (dateField.value) params.select += ',' + dateField.value
    if (openingHoursField.value) params.select += ',' + openingHoursField.value
    return params as QueryObject
  })

  const eventsQuery = useDebounce(eventsQueryRaw, 300)

  const { data: eventsData, error: eventsError } = useFetch(
    computed(() => mainDataset.value?.href ? `${mainDataset.value.href}/lines` : null),
    { query: eventsQuery }
  )

  const events = computed(() => {
    if (!eventsData.value) return []
    const response = eventsData.value as { results: Record<string, unknown>[] }

    if (!labelField.value) return []

    const result = ([] as unknown[]).concat(...response.results.map(event => {
      const baseEvent : { editable: boolean, id: string, originalId: string, title: string, colorFieldValue: string | false, openingHours?: string } = {
        editable: layout.value === 'admin',
        id: event._id as string,
        originalId: event._id as string,
        title: event[labelField.value!] as string,
        colorFieldValue: color.value?.type === 'multicolor' && event[color.value?.field] as string | false,
      }

      if (openingHoursField.value && event[openingHoursField.value]) {
        baseEvent.openingHours = event[openingHoursField.value] as string
        let openingHours: Record<string, { from: number[], to: number[] }[]> = {}
        try {
          const dailyHours = getDailyOpeningHours(event[openingHoursField.value] as string)
          if (dailyHours) {
            openingHours = Object.assign({}, ...dailyHours.map(oh => ({
              [{
                Mo: 'lun',
                Tu: 'mar',
                We: 'mer',
                Th: 'jeu',
                Fr: 'ven',
                Sa: 'sam',
                Su: 'dim'
              }[oh.day]]: oh.hours.map(h => ({ from: h.from.split(':'), to: (h.to ?? '').split(':') }))
            })))
          }
        } catch (err) {
          console.log('Erreur : ', baseEvent.openingHours, err)
        }

        if (!startDateField.value || !endDateField.value) return []
        let start = dayjs(reactiveSearchParams.start.localeCompare(event[startDateField.value] as string) > 0 ? reactiveSearchParams.start : event[startDateField.value] as string)
        const end = dayjs(reactiveSearchParams.end.localeCompare(event[endDateField.value] as string) < 0 ? reactiveSearchParams.end : event[endDateField.value] as string)
        const evts = []

        while (!start.isAfter(end)) {
          const hours = openingHours[start.format('dd')]
          if (hours?.length) {
            if (reactiveSearchParams.view === 'dayGridMonth') {
              evts.push({
                ...baseEvent,
                id: start.toISOString() + baseEvent.id,
                start: start.hour(hours[0].from[0]).minute(hours[0].from[1]).toISOString(),
                end: start.hour(hours[hours.length - 1].to[0]).minute(hours[hours.length - 1].to[1]).toISOString(),
                allDay: false
              })
              start = start.add(1, 'day').hour(0).minute(0)
            } else {
              hours.forEach(hour => {
                evts.push({
                  ...baseEvent,
                  id: start.hour(hour.from[0]).minute(hour.from[1]).toISOString() + baseEvent.id,
                  start: start.hour(hour.from[0]).minute(hour.from[1]).toISOString(),
                  end: start.hour(hour.to[0]).minute(hour.to[1]).toISOString(),
                  allDay: false
                })
              })
              start = start.add(1, 'day').hour(0).minute(0)
            }
          } else start = start.add(1, 'day')
        }
        return evts
      } else {
        const startKey = (startDateField.value || dateField.value) as string
        const endKey = endDateField.value as string
        const startValue = startKey ? event[startKey] as string | undefined : undefined
        const endValue = endKey ? event[endKey] as string | undefined : undefined
        const effectiveStart = startValue || endValue
        const effectiveHasStartAndEnd = !!(startValue && endValue && startDateField.value && endDateField.value)
        return [{
          ...baseEvent,
          start: effectiveStart,
          end: effectiveHasStartAndEnd ? (endDateType.value !== 'date-time' ? dayjs(endValue!).add(1, 'day').format('YYYY-MM-DD') : endValue) : undefined,
          allDay: !effectiveHasStartAndEnd || (startDateType.value === 'date' && endDateType.value === 'date') || (new Date(endValue!).getTime() - new Date(startValue!).getTime() > 2 * 24 * 60 * 60 * 1000)
        }]
      }
    }))
    return result
  })
  watch(eventsError, (e) => {
    if (e) sendUiNotif({ type: 'error', msg: 'Erreur lors du chargement des événements', error: e })
  })

  return { events, colorPalette }
}
