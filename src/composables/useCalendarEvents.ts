import { ref, computed, watch } from 'vue'
import { useTheme } from 'vuetify'
import { useCalendarData } from './useCalendarData'
import { useConfig } from './config'
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import type { Theme } from '@/config'
import type { Ref } from 'vue'

export function useCalendarEvents (
  dragState: Ref<{ originalId: string } | null>,
  eventMenuOpen: Ref<boolean | undefined>,
  type: Ref<'month' | 'week' | 'day'>
) {
  const theme = useTheme()
  const { dayjs } = useLocaleDayjs()
  const { events, colorPalette } = useCalendarData()
  const { color } = useConfig()

  function getColor (value: string) {
    if (color.value?.type === 'monochrome') {
      const colors = color.value.colors
      if (!colors) return undefined
      if (colors.type === 'custom') return colors.hexValue
      const themeColors = colors as Theme
      return theme.current.value.colors[themeColors.strValue ?? '']
    } else {
      return colorPalette.value?.[value] ?? theme.current.value.colors.primary
    }
  }

  function splitMultiDayEvent (
    base: Record<string, unknown>,
    startDate: ReturnType<typeof dayjs>,
    endDate: ReturnType<typeof dayjs>,
    idPrefix: string,
    originalStart: unknown,
    originalEnd: unknown
  ): Record<string, unknown>[] {
    const isMultiDay = !startDate.isSame(endDate, 'day')
    const hasTime = startDate.format('HH:mm') !== '00:00' || endDate.format('HH:mm') !== '00:00'

    if (!(isMultiDay && hasTime && type.value !== 'month')) {
      return [{
        ...base,
        start: startDate.format('YYYY-MM-DD HH:mm'),
        end: endDate.format('YYYY-MM-DD HH:mm'),
        originalStart,
        originalEnd,
        timed: true,
        allDay: false,
      }]
    }

    const lastDay = endDate.startOf('day')
    const totalDays = lastDay.diff(startDate.startOf('day'), 'day') + 1
    const segments: Record<string, unknown>[] = []

    const baseSegment = {
      ...base,
      originalId: base.originalId ?? base.id,
      originalStart,
      originalEnd,
    }

    // Premier segment : du début original jusqu'à la fin du premier jour
    // Si le début est trop proche de minuit, on remonte l'affichage pour garantir la lisibilité
    const firstSegEnd = startDate.endOf('day')
    const firstSegDisplayStart = firstSegEnd.diff(startDate, 'minute') < 60
      ? firstSegEnd.subtract(50, 'minute')
      : startDate
    segments.push({
      ...baseSegment,
      id: `${idPrefix}-${startDate.format('YYYY-MM-DD')}`,
      start: firstSegDisplayStart.format('YYYY-MM-DD HH:mm'),
      segmentActualStart: startDate.format('YYYY-MM-DD HH:mm'),
      end: firstSegEnd.format('YYYY-MM-DD HH:mm'),
      timed: true,
      allDay: false,
      isFirstSegment: true,
      isLastSegment: false,
      dayIndex: 1,
      totalDays,
    })

    // Segment médian : une seule barre all-day couvrant tous les jours intermédiaires
    if (totalDays > 2) {
      const firstMiddle = startDate.startOf('day').add(1, 'day')
      const lastMiddle = lastDay.subtract(1, 'day')
      segments.push({
        ...baseSegment,
        id: `${idPrefix}-middle`,
        start: firstMiddle.format('YYYY-MM-DD'),
        end: lastMiddle.format('YYYY-MM-DD'),
        timed: false,
        allDay: true,
        isFirstSegment: false,
        isLastSegment: false,
        dayIndex: 2,
        totalDays,
      })
    }

    // Dernier segment : ignoré si l'événement se termine exactement à minuit (durée zéro)
    if (endDate.format('HH:mm') !== '00:00') {
      segments.push({
        ...baseSegment,
        id: `${idPrefix}-${lastDay.format('YYYY-MM-DD')}`,
        start: lastDay.format('YYYY-MM-DD HH:mm'),
        end: endDate.format('YYYY-MM-DD HH:mm'),
        timed: true,
        allDay: false,
        isFirstSegment: false,
        isLastSegment: true,
        dayIndex: totalDays,
        totalDays,
      })
    }

    return segments
  }

  function buildEvents () {
    const rawEvents = (events.value || []) as Record<string, unknown>[]

    const invalidEvents = rawEvents.filter(e => !e.start)
    if (invalidEvents.length) console.warn(`${invalidEvents.length} événement(s) ignoré(s) car sans date`)

    const result: Record<string, unknown>[] = []

    rawEvents.filter(e => e.start).forEach(e => {
      const base = {
        ...e,
        name: e.title,
        color: getColor(e.colorFieldValue as string),
        isDragging: false,
      }

      const startDate = dayjs(e.start as string)
      const rawEndDate = dayjs((e.end as string) || (e.start as string))
      if (!startDate.isValid() || !rawEndDate.isValid()) return

      const endTimeStr = rawEndDate.format('HH:mm')
      const endIsEffectivelyAllDay = endTimeStr === '00:00' || endTimeStr >= '23:59'
      const eventHasTime = startDate.format('HH:mm') !== '00:00' || !endIsEffectivelyAllDay
      const isAllDay = eventHasTime ? false : !!e.allDay

      let endDate = rawEndDate

      const isPunctual = !isAllDay && (startDate.isSame(rawEndDate) || !e.end)
      let displayStartDate = startDate
      if (isPunctual) {
        const extended = startDate.add(30, 'minute')
        if (extended.isSame(startDate, 'day')) {
          endDate = extended
        } else {
          endDate = startDate.endOf('day')
          displayStartDate = endDate.subtract(50, 'minute')
        }
      }

      if (isAllDay) {
        const endEffectiveDay = (endTimeStr === '00:00' ? endDate.subtract(1, 'day') : endDate).startOf('day')
        const allDayTotalDays = endEffectiveDay.diff(startDate.startOf('day'), 'day') + 1
        result.push({
          ...base,
          start: startDate.format('YYYY-MM-DD'),
          end: endEffectiveDay.format('YYYY-MM-DD'),
          timed: false,
          allDay: true,
          originalStart: e.start,
          originalEnd: e.end,
          isPunctual: false,
          totalDays: allDayTotalDays > 1 ? allDayTotalDays : undefined,
        })
      } else {
        result.push(...splitMultiDayEvent(
          { ...base, isPunctual },
          displayStartDate,
          endDate,
          e.id as string,
          e.start,
          e.end
        ))
      }
    })

    const seen = new Map<string, number>()
    result.forEach((evt) => {
      if (!evt.timed) return
      const key = `${evt.start}|${evt.end}`
      const count = seen.get(key) ?? 0
      if (count > 0) {
        const offsetMinutes = count * 2
        evt.start = dayjs(evt.start as string).add(offsetMinutes, 'minute').format('YYYY-MM-DD HH:mm')
        evt.end = dayjs(evt.end as string).add(offsetMinutes, 'minute').format('YYYY-MM-DD HH:mm')
      }
      seen.set(key, count + 1)
    })

    return result
  }

  const allEventsRef = ref<Record<string, unknown>[]>([])
  const selectionEvents = ref<Record<string, unknown>[]>([])
  const allEventsComputed = computed(() => [...allEventsRef.value, ...selectionEvents.value])

  watch(eventMenuOpen, (open, wasOpen) => {
    if (!open && wasOpen) {
      selectionEvents.value = []
      if (!dragState.value) {
        allEventsRef.value = buildEvents()
      }
    }
  })

  watch(
    [events, colorPalette, type],
    () => {
      if (dragState.value) return
      allEventsRef.value = buildEvents()
    },
    { immediate: true, deep: true }
  )

  return { allEventsRef, selectionEvents, allEventsComputed, splitMultiDayEvent, getColor, buildEvents }
}
