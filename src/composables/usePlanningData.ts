import { ref, computed, watch } from 'vue'
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import { useConfig } from './config'
import { useUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { ofetch } from 'ofetch'
import { getConceptFilters } from '@data-fair/lib-vue/concept-filters.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import { filters2qs } from '@data-fair/lib-utils/filters'

const PAGE_SIZE = 20

export type PlanningEventItem = {
  id: string
  originalId: string
  name: string
  eventColor: unknown
  timeLabel: string
  allDay: boolean
  originalStart: string
  originalEnd: string | undefined
  editable: boolean
  dayIndex?: number
  totalDays?: number
}

export type PlanningDay = {
  date: string
  events: PlanningEventItem[]
}

export function usePlanningData (getColor: (value: string) => unknown) {
  const { dayjs } = useLocaleDayjs()
  const {
    config,
    dataset,
    labelField,
    startDateField,
    endDateField,
    dateField,
    startDateType,
    endDateType,
    dateType,
    color: colorConfig,
    layout,
  } = useConfig()
  const { sendUiNotif } = useUiNotif()

  const nextUrl = ref<string | null>(null)
  const rawResults = ref<Record<string, unknown>[]>([])
  const hasMore = ref(true)
  const isLoading = ref(false)
  const initialized = ref(false)

  function buildInitialUrl (): string | null {
    if (!dataset.value?.href) return null

    const select = [
      '_id',
      labelField.value,
      startDateField.value ? startDateField.value : null,
      startDateField.value && endDateField.value ? endDateField.value : null,
      !startDateField.value ? dateField.value : null,
      colorConfig.value?.type === 'multicolor' && colorConfig.value.field ? colorConfig.value.field : null,
    ].filter(Boolean).join(',')

    const sortField = startDateField.value || dateField.value

    const params = new URLSearchParams()
    params.set('size', String(PAGE_SIZE))
    params.set('select', select)
    if (sortField) params.set('sort', sortField)
    if (layout.value !== 'simple') params.set('t', String(Date.now()))

    const staticFilters = config.value.staticFilters
    if (staticFilters?.length) {
      params.set('qs', filters2qs(staticFilters.map((f: any) =>
        typeof f.field === 'string' ? { ...f, field: { key: f.field } } : f
      ) as any))
    }

    const conceptFilters = getConceptFilters(reactiveSearchParams, dataset.value.id)
    for (const [key, value] of Object.entries(conceptFilters)) {
      if (key !== '_c_date_match') params.set(key, value as string)
    }

    // _c_date_match doit contenir une virgule littérale (séparateur), pas encodée en %2C
    return `${dataset.value.href}/lines?_c_date_match=now/d,&${params.toString()}`
  }

  async function loadMore () {
    if (isLoading.value || !hasMore.value) return

    const url = nextUrl.value ?? buildInitialUrl()
    if (!url) return

    isLoading.value = true
    try {
      // ofetch direct conservé : useFetch est inadapté à la pagination impérative
      // (nextUrl n'est connu qu'après le fetch précédent, ce qui empêche tout
      // computed url stable). Cf. TODO P1-3.
      const response = await ofetch(url)
      rawResults.value = [...rawResults.value, ...response.results]
      nextUrl.value = response.next ?? null
      hasMore.value = !!response.next
    } catch (e: any) {
      hasMore.value = false
      nextUrl.value = null
      if (e?.response?.status !== 400) {
        sendUiNotif({ type: 'error', msg: 'Erreur lors du chargement du planning', error: e })
      }
    } finally {
      isLoading.value = false
      initialized.value = true
    }
  }

  function reset () {
    nextUrl.value = null
    rawResults.value = []
    hasMore.value = true
    isLoading.value = false
    initialized.value = false
  }

  const planningDays = computed((): PlanningDay[] => {
    const dayMap = new Map<string, PlanningEventItem[]>()

    rawResults.value.forEach(e => {
      const startStr = (
        startDateField.value && e[startDateField.value]
          ? e[startDateField.value]
          : dateField.value && e[dateField.value]
            ? e[dateField.value]
            : endDateField.value && e[endDateField.value]
              ? e[endDateField.value]
              : null
      ) as string | null
      if (!startStr) return

      const endStr = (endDateField.value && e[endDateField.value] ? e[endDateField.value] : undefined) as string | undefined

      const startDate = dayjs(startStr)
      const rawEndDate = dayjs(endStr || startStr)
      // Garde-fou : une date invalide (ex. "2026-08-32") rend les boucles while
      // ci-dessous infinies (dayjs.isAfter/isSame retournent false et add() reste invalide).
      if (!startDate.isValid() || !rawEndDate.isValid()) return

      const startHasTime = startDate.format('HH:mm') !== '00:00'
      const endTimeStr = endStr ? rawEndDate.format('HH:mm') : '00:00'
      const endHasTime = endStr ? (endTimeStr !== '00:00' && endTimeStr < '23:59') : false
      const isDateOnly =
        !!(startDateField.value && endDateField.value &&
          startDateType.value === 'date' && endDateType.value === 'date') ||
        (!!(startDateField.value && !endDateField.value) && startDateType.value === 'date') ||
        (!startDateField.value && !endDateField.value && dateType.value === 'date')
      const isAllDay = isDateOnly || (!startHasTime && !endHasTime)

      const isPunctual = !isAllDay && startDate.isSame(rawEndDate)

      const name = (labelField.value ? e[labelField.value] : '') as string ?? ''
      const colorFieldValue = (
        colorConfig.value?.type === 'multicolor' && colorConfig.value.field
          ? e[colorConfig.value.field]
          : ''
      ) as string
      const eventColor = getColor(colorFieldValue)

      const base: Omit<PlanningEventItem, 'timeLabel'> = {
        id: e._id as string,
        originalId: e._id as string,
        name,
        eventColor,
        allDay: isAllDay,
        originalStart: startStr,
        originalEnd: endStr,
        editable: layout.value === 'admin',
      }

      const todayStart = dayjs().startOf('day')

      if (isAllDay) {
        // Convention d'exclusivité de la fin :
        // - champs de type "date" : la fin est inclusive (dernier jour compris),
        //   aucune soustraction.
        // - date-time finissant à minuit sur un autre jour : fin exclusive
        //   (l'événement se termine à la fin du jour précédent).
        // - date-time même jour (début = fin à minuit) : jour unique inclus.
        const endIsExclusiveMidnight =
          endDateType.value !== 'date' &&
          rawEndDate.format('HH:mm') === '00:00' &&
          rawEndDate.isAfter(startDate, 'day')
        const lastDay = endStr
          ? (endIsExclusiveMidnight ? rawEndDate.subtract(1, 'day') : rawEndDate).startOf('day')
          : startDate.startOf('day')
        let cursor = startDate.startOf('day').isBefore(todayStart) ? todayStart : startDate.startOf('day')
        const allDayLabel = isDateOnly ? '' : 'Toute la journée'
        const totalDays = lastDay.diff(startDate.startOf('day'), 'day') + 1
        while (!cursor.isAfter(lastDay)) {
          const cursorDayIndex = cursor.diff(startDate.startOf('day'), 'day') + 1
          addToDay(dayMap, cursor.format('YYYY-MM-DD'), {
            ...base,
            timeLabel: allDayLabel,
            ...(totalDays > 1 ? { dayIndex: cursorDayIndex, totalDays } : {}),
          })
          cursor = cursor.add(1, 'day')
        }
      } else if (isPunctual) {
        if (!startDate.isBefore(todayStart)) {
          addToDay(dayMap, startDate.format('YYYY-MM-DD'), {
            ...base,
            timeLabel: startDate.format('HH:mm'),
          })
        }
      } else {
        const isMultiDay = !startDate.isSame(rawEndDate, 'day')
        if (!isMultiDay) {
          if (!startDate.isBefore(todayStart)) {
            addToDay(dayMap, startDate.format('YYYY-MM-DD'), {
              ...base,
              timeLabel: `${startDate.format('HH:mm')} - ${rawEndDate.format('HH:mm')}`,
            })
          }
        } else {
          const lastDay = rawEndDate.startOf('day')
          let cursor = startDate.startOf('day').isBefore(todayStart) ? todayStart : startDate.startOf('day')
          const totalDays = lastDay.diff(startDate.startOf('day'), 'day') + 1
          while (!cursor.isAfter(lastDay)) {
            const isFirst = cursor.isSame(startDate, 'day')
            const isLast = cursor.isSame(lastDay, 'day')
            const segStart = isFirst ? startDate : cursor.startOf('day')
            const segEnd = isLast ? rawEndDate : cursor.endOf('day')
            const isFullDaySegment = segStart.format('HH:mm') === '00:00' && segEnd.format('HH:mm') === '23:59'
            const cursorDayIndex = cursor.diff(startDate.startOf('day'), 'day') + 1
            const timeLabel = isFirst
              ? segStart.format('HH:mm')
              : isLast
                ? `Jusqu'à ${segEnd.format('HH:mm')}`
                : isFullDaySegment ? 'Toute la journée' : `${segStart.format('HH:mm')} - ${segEnd.format('HH:mm')}`
            addToDay(dayMap, cursor.format('YYYY-MM-DD'), {
              ...base,
              id: `${base.id}-${cursor.format('YYYY-MM-DD')}`,
              timeLabel,
              dayIndex: cursorDayIndex,
              totalDays,
            })
            cursor = cursor.add(1, 'day')
          }
        }
      }
    })

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, events]) => ({
        date,
        events: events.sort((a, b) => {
          if (a.allDay && !b.allDay) return -1
          if (!a.allDay && b.allDay) return 1
          return a.originalStart.localeCompare(b.originalStart)
        }),
      }))
  })

  const planningTitle = computed((): string => {
    if (planningDays.value.length === 0) return ''
    const first = dayjs(planningDays.value[0].date)
    const last = dayjs(planningDays.value[planningDays.value.length - 1].date)
    const diffDays = last.diff(first, 'day')
    const diffYears = last.diff(first, 'year')

    if (diffYears >= 1) {
      if (first.year() === last.year()) return String(first.year())
      return `${first.year()} – ${last.year()}`
    } else if (diffDays > 31) {
      const fmt = (d: ReturnType<typeof dayjs>) =>
        d.format(d.year() === first.year() ? 'MMMM' : 'MMMM YYYY')
      return `${fmt(first)} – ${last.format('MMMM YYYY')}`
    } else {
      if (first.isSame(last, 'day')) return first.format('D MMMM YYYY')
      if (first.isSame(last, 'month')) return `${first.format('D')} – ${last.format('D MMMM YYYY')}`
      return `${first.format('D MMM')} – ${last.format('D MMM YYYY')}`
    }
  })

  // Réinitialise et recharge quand le dataset, les champs, les filtres statiques ou les concept filters changent
  const querySignature = computed(() => [
    dataset.value?.href,
    labelField.value,
    startDateField.value,
    endDateField.value,
    dateField.value,
    colorConfig.value?.type === 'multicolor' ? (colorConfig.value as any).field : null,
    JSON.stringify(config.value.staticFilters ?? []),
    JSON.stringify(getConceptFilters(reactiveSearchParams, dataset.value?.id)),
  ].join('|'))

  watch(querySignature, () => {
    reset()
    loadMore()
  })

  return { planningDays, hasMore, isLoading, initialized, loadMore, reset, planningTitle }
}

function addToDay (map: Map<string, PlanningEventItem[]>, date: string, item: PlanningEventItem) {
  if (!map.has(date)) map.set(date, [])
  map.get(date)!.push(item)
}
