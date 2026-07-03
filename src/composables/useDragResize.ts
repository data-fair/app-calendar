import { ref } from 'vue'
import { useConfig } from './config'
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import { useDateBounds } from './useDateBounds'
import type { Ref } from 'vue'

export type DragState = {
  originalId: string
  mode: 'move' | 'resize-start' | 'resize-end'
  startPointer: any
  originalStart: any
  originalEnd: any
  targetEvent: Record<string, unknown>
}

type SplitFn = (
  base: Record<string, unknown>,
  startDate: any,
  endDate: any,
  idPrefix: string,
  originalStart: unknown,
  originalEnd: unknown
) => Record<string, unknown>[]

export function useDragResize (
  dragState: Ref<DragState | null>,
  allEventsRef: Ref<Record<string, unknown>[]>,
  visibleDates: Ref<string[]>,
  splitMultiDayEvent: SplitFn,
  getColor: (value: string) => unknown,
  eventMenuOpen: Ref<boolean | undefined>,
  editMode: Ref<boolean>,
  selectedEvent: Ref<Record<string, unknown> | null>,
  eventMenuActivator: Ref<HTMLElement | undefined>,
  type: Ref<string>
) {
  const { dayjs } = useLocaleDayjs()
  const { startDateField, endDateField, dateField } = useConfig()
  const { resolveMinDate, resolveMaxDate } = useDateBounds()

  const hasDragged = ref(false)
  const justDragged = ref(false)
  const pendingDrag = ref<{
    originalId: string
    mode: 'move' | 'resize-start' | 'resize-end'
    originalStart: any
    originalEnd: any
    isPunctual: boolean
  } | null>(null)
  const isHoveringResizeZone = ref(false)
  const lastKnownHour = ref<number>(0)
  const lastKnownMinute = ref<number>(0)

  function applyDrag (targetDay: any, hour: number, minute: number) {
    if (!dragState.value) return

    const mouse = targetDay.hour(hour).minute(minute)
    const deltaMinutes = mouse.diff(dragState.value.startPointer, 'minute')

    if (Math.abs(deltaMinutes) > 0) hasDragged.value = true

    let newStart = dragState.value.originalStart
    let newEnd = dragState.value.originalEnd

    if (dragState.value.mode === 'move') {
      newStart = dragState.value.originalStart.add(deltaMinutes, 'minute')
      if (dragState.value.targetEvent.isPunctual) {
        const extended = newStart.add(30, 'minute')
        newEnd = extended.isSame(newStart, 'day') ? extended : newStart.endOf('day')
      } else {
        newEnd = dragState.value.originalEnd.add(deltaMinutes, 'minute')
      }
    } else if (dragState.value.mode === 'resize-end') {
      const minEnd = dragState.value.originalStart.add(15, 'minute')
      newEnd = mouse.isBefore(minEnd) ? minEnd : mouse
    } else {
      const maxStart = dragState.value.originalEnd.subtract(15, 'minute')
      newStart = mouse.isAfter(maxStart) ? maxStart : mouse
    }

    const min = resolveMinDate()
    const max = resolveMaxDate()

    if (dragState.value.mode === 'move') {
      if (min && newStart.isBefore(min)) {
        const shift = min.diff(newStart, 'minute')
        newStart = newStart.add(shift, 'minute')
        newEnd = newEnd.add(shift, 'minute')
      }
      if (max && newEnd.isAfter(max)) {
        const shift = newEnd.diff(max, 'minute')
        newStart = newStart.subtract(shift, 'minute')
        newEnd = newEnd.subtract(shift, 'minute')
      }
    } else if (dragState.value.mode === 'resize-start') {
      if (min && newStart.isBefore(min)) newStart = min
    } else if (dragState.value.mode === 'resize-end') {
      if (max && newEnd.isAfter(max)) newEnd = max
    }

    const originalId = dragState.value.originalId
    const newSegments = splitMultiDayEvent(
      { ...dragState.value.targetEvent, isDragging: true },
      newStart,
      newEnd,
      originalId,
      dragState.value.targetEvent.originalStart ?? dragState.value.targetEvent.start,
      dragState.value.targetEvent.originalEnd ?? dragState.value.targetEvent.end
    )

    const firstIdx = allEventsRef.value.findIndex(
      e => (e.originalId ?? e.id) === originalId
    )
    const filtered = allEventsRef.value.filter(
      e => (e.originalId ?? e.id) !== originalId
    )
    filtered.splice(firstIdx >= 0 ? firstIdx : filtered.length, 0, ...newSegments)
    allEventsRef.value = filtered
  }

  function getHourMinuteFromY (clientY: number): { hour: number, minute: number } | null {
    const scrollArea = document.querySelector('.v-calendar-daily__scroll-area') as HTMLElement
    if (!scrollArea) return null
    const rect = scrollArea.getBoundingClientRect()
    const relY = (clientY - rect.top) + scrollArea.scrollTop
    const totalMinutes = (relY / scrollArea.scrollHeight) * 24 * 60
    return {
      hour: Math.max(0, Math.min(23, Math.floor(totalMinutes / 60))),
      minute: Math.max(0, Math.min(59, Math.floor(totalMinutes % 60))),
    }
  }

  function onGlobalMouseMove (nativeEvent: MouseEvent) {
    if (!dragState.value) return

    const dayEls = Array.from(document.querySelectorAll('.v-calendar-daily__day')) as HTMLElement[]
    if (dayEls.length === 0 || dayEls.length !== visibleDates.value.length) return

    const sorted = [...dayEls].sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)

    let targetDate: any = null
    for (let i = 0; i < sorted.length; i++) {
      const rect = sorted[i].getBoundingClientRect()
      if (nativeEvent.clientX >= rect.left && nativeEvent.clientX <= rect.right) {
        targetDate = dayjs(visibleDates.value[i])
        break
      }
    }
    if (!targetDate) return

    const time = getHourMinuteFromY(nativeEvent.clientY)
    if (!time) return

    applyDrag(targetDate, time.hour, time.minute)
  }

  function onMouseDownEvent (nativeEvent: Event, { event }: { event: Record<string, unknown> }) {
    if (!event.editable || event.allDay || (event.originalId ?? event.id) === '__preview__') return
    if (eventMenuOpen.value && editMode.value) return

    const originalId = (event.originalId ?? event.id) as string
    const originalStart = dayjs((event.originalStart ?? event.start) as string)
    const originalEnd = dayjs((event.originalEnd ?? event.originalStart ?? event.start) as string)

    let mode: 'move' | 'resize-start' | 'resize-end' = 'move'
    if (!event.isPunctual && type.value !== 'month') {
      const target = (nativeEvent.target as HTMLElement).closest('.v-event, .v-event-timed, .v-calendar-event') as HTMLElement | null
      if (target) {
        const rect = target.getBoundingClientRect()
        const offsetY = (nativeEvent as MouseEvent).clientY - rect.top
        if (offsetY < 8) mode = 'resize-start'
        else if (rect.height - offsetY < 8) mode = 'resize-end'
      }
    }

    pendingDrag.value = { originalId, mode, originalStart, originalEnd, isPunctual: !!event.isPunctual }
  }

  function onMouseMoveEvent (nativeEvent: Event, { event }: { event: Record<string, unknown> }) {
    if (!event.editable || event.isPunctual || event.allDay || type.value === 'month') return
    const target = (nativeEvent.target as HTMLElement).closest('.v-event, .v-event-timed, .v-calendar-event') as HTMLElement | null
    if (!target) return
    const rect = target.getBoundingClientRect()
    const offsetY = (nativeEvent as MouseEvent).clientY - rect.top
    isHoveringResizeZone.value = offsetY < 8 || rect.height - offsetY < 8
  }

  function onMouseLeaveEvent () {
    isHoveringResizeZone.value = false
  }

  function finalizeDrag () {
    const drag = dragState.value
    const didDrag = hasDragged.value

    dragState.value = null
    pendingDrag.value = null
    hasDragged.value = false

    if (!drag || !didDrag) return

    justDragged.value = true

    const currentSegments = allEventsRef.value.filter(
      e => (e.originalId ?? e.id) === drag.originalId
    )
    const firstSeg = currentSegments.find(s => s.isFirstSegment) ?? currentSegments[0]
    const lastSeg = currentSegments.find(s => s.isLastSegment) ?? currentSegments[currentSegments.length - 1]
    const newStart = (firstSeg?.start ?? drag.originalStart.format('YYYY-MM-DD HH:mm')) as string
    const newEnd = (lastSeg?.end ?? drag.originalEnd.format('YYYY-MM-DD HH:mm')) as string

    const event: Record<string, unknown> = {
      id: drag.originalId,
      originalId: drag.originalId,
      start: newStart,
      end: newEnd,
      forceEdit: true,
    }
    if (startDateField.value && endDateField.value) {
      event[startDateField.value] = newStart
      event[endDateField.value] = newEnd
    } else if (startDateField.value) {
      event[startDateField.value] = newStart
    } else if (dateField.value) {
      event[dateField.value] = newStart
    }

    selectedEvent.value = event
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const innerEl = document.querySelector(`[data-event-id="${drag.originalId}"]`) as HTMLElement | null
      if (innerEl) eventMenuActivator.value = (innerEl.closest('.v-event-timed') ?? innerEl) as HTMLElement
      eventMenuOpen.value = true
    }))
  }

  return {
    hasDragged,
    pendingDrag,
    justDragged,
    isHoveringResizeZone,
    lastKnownHour,
    lastKnownMinute,
    onMouseDownEvent,
    onMouseMoveEvent,
    onMouseLeaveEvent,
    onGlobalMouseMove,
    finalizeDrag,
  }
}
