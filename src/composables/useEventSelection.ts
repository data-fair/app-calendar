import { ref } from 'vue'
import { useConfig } from './config'
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import { useDateBounds } from './useDateBounds'
import type { Ref } from 'vue'

type SplitFn = (
  base: Record<string, unknown>,
  startDate: any,
  endDate: any,
  idPrefix: string,
  originalStart: unknown,
  originalEnd: unknown
) => Record<string, unknown>[]

export function useEventSelection (
  selectionEvents: Ref<Record<string, unknown>[]>,
  eventMenuOpen: Ref<boolean | undefined>,
  editMode: Ref<boolean>,
  selectedEvent: Ref<Record<string, unknown> | null>,
  eventMenuActivator: Ref<HTMLElement | undefined>,
  splitMultiDayEvent: SplitFn
) {
  const { dayjs } = useLocaleDayjs()
  const { startDateType, dateType, startDateField, endDateField, dateField } = useConfig()
  const { resolveMinDate, resolveMaxDate } = useDateBounds()

  const isSelecting = ref(false)
  const isPointSelect = ref(false)
  const selectionStart = ref<{ date: string, time: string } | null>(null)
  const selectionEnd = ref<{ date: string, time: string } | null>(null)

  function toDateTime ({ date, time }: { date: string, time: string }) {
    return `${date} ${time}`
  }

  function onMouseDownTime (nativeEvent: Event, { date, time }: { date: string, time: string }) {
    const target = nativeEvent.target as HTMLElement
    if (target.closest('.v-event, .v-event-timed, .v-calendar-event')) return

    const hasTime = startDateType.value === 'date-time' || dateType.value === 'date-time'
    const hasEndDate = !!endDateField.value
    if (!hasTime) return

    const clickedAt = dayjs(toDateTime({ date, time }))
    const min = resolveMinDate()
    const max = resolveMaxDate()
    if (min && clickedAt.isBefore(min)) return
    if (max && clickedAt.isAfter(max)) return

    eventMenuActivator.value = nativeEvent.target as HTMLElement
    selectionStart.value = { date, time }
    selectionEnd.value = { date, time }

    const start = toDateTime({ date, time })
    const previewEnd = dayjs(start).add(30, 'minute').format('YYYY-MM-DD HH:mm')

    if (!hasEndDate) {
      isPointSelect.value = true
      selectionEvents.value = splitMultiDayEvent(
        {
          id: '__preview__',
          name: 'Nouvel événement',
          timed: true,
          allDay: false,
          color: 'rgba(var(--v-theme-primary), 0.4)',
          isDragging: false,
          isPunctual: true,
        },
        dayjs(start),
        dayjs(previewEnd),
        '__preview__',
        start,
        undefined
      )
    } else {
      isSelecting.value = true
      selectionEvents.value = splitMultiDayEvent(
        {
          id: '__preview__',
          name: 'Nouvel événement',
          timed: true,
          allDay: false,
          color: 'rgba(var(--v-theme-primary), 0.4)',
          isDragging: false,
          isPunctual: false,
        },
        dayjs(start),
        dayjs(previewEnd),
        '__preview__',
        start,
        previewEnd
      )
    }
  }

  function onMouseMoveTime (_nativeEvent: Event, tms: { year: number, month: number, day: number, hour: number, minute: number }) {
    if (!isSelecting.value || !selectionStart.value) return

    const date = `${tms.year}-${String(tms.month).padStart(2, '0')}-${String(tms.day).padStart(2, '0')}`
    const time = `${String(tms.hour).padStart(2, '0')}:${String(tms.minute).padStart(2, '0')}`
    selectionEnd.value = { date, time }

    let start = toDateTime(selectionStart.value)
    let end = toDateTime({ date, time })
    if (dayjs(end).isBefore(dayjs(start))) [start, end] = [end, start]
    if (start === end) end = dayjs(start).add(30, 'minute').format('YYYY-MM-DD HH:mm')

    const min = resolveMinDate()
    const max = resolveMaxDate()
    if (min && dayjs(start).isBefore(min)) start = min.format('YYYY-MM-DD HH:mm')
    if (max && dayjs(end).isAfter(max)) end = max.format('YYYY-MM-DD HH:mm')

    selectionEvents.value = splitMultiDayEvent(
      {
        id: '__preview__',
        name: 'Nouvel événement',
        timed: true,
        allDay: false,
        color: 'rgba(var(--v-theme-primary), 0.4)',
        isDragging: false,
        isPunctual: false,
      },
      dayjs(start),
      dayjs(end),
      '__preview__',
      start,
      end
    )
  }

  function finalizeSelection () {
    if (isPointSelect.value) {
      isPointSelect.value = false
      const start = selectionStart.value ? toDateTime(selectionStart.value) : null
      selectionStart.value = null
      selectionEnd.value = null
      if (!start) {
        selectionEvents.value = []
        return
      }

      const event: Record<string, unknown> = {}
      if (startDateField.value) event[startDateField.value] = start
      else if (dateField.value) event[dateField.value] = start

      selectedEvent.value = event
      requestAnimationFrame(() => requestAnimationFrame(() => {
        eventMenuOpen.value = true
      }))
      return
    }

    if (!isSelecting.value) return
    isSelecting.value = false
    if (!selectionStart.value || !selectionEnd.value) {
      selectionStart.value = null
      selectionEnd.value = null
      selectionEvents.value = []
      return
    }

    let start = toDateTime(selectionStart.value)
    let end = toDateTime(selectionEnd.value)
    if (dayjs(end).isBefore(dayjs(start))) [start, end] = [end, start]
    if (start === end) end = dayjs(start).add(30, 'minute').format('YYYY-MM-DD HH:mm')

    const event: Record<string, unknown> = {}
    if (startDateField.value && endDateField.value) {
      event[startDateField.value] = start
      event[endDateField.value] = end
    } else if (dateField.value) {
      event[dateField.value] = start
    }

    selectedEvent.value = event
    requestAnimationFrame(() => requestAnimationFrame(() => {
      eventMenuOpen.value = true
    }))
  }

  return {
    isSelecting,
    isPointSelect,
    selectionStart,
    selectionEnd,
    onMouseDownTime,
    onMouseMoveTime,
    finalizeSelection,
  }
}
