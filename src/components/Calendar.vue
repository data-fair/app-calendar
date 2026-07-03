<script setup lang="ts">
import { mdiChevronLeft, mdiChevronRight } from '@mdi/js'
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import { useConfig } from '@/composables/config'
import { useCalendarData } from '@/composables/useCalendarData'
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import { useCalendarEvents } from '@/composables/useCalendarEvents'
import { useDragResize, type DragState } from '@/composables/useDragResize'
import { useEventSelection } from '@/composables/useEventSelection'
import { useDateBounds } from '@/composables/useDateBounds'
import EventDetails from './events/EventDetails.vue'
import PlanningView from './PlanningView.vue'

const { dayjs } = useLocaleDayjs()
const { config, layout, startDateField, endDateField, dateField, dataset } = useConfig()
const { events } = useCalendarData()
const { resolveMinDate, resolveMaxDate } = useDateBounds()

// État partagé entre composables
const selectedEvent = ref<Record<string, unknown> | null>(null)
const eventMenuOpen = ref<boolean | undefined>(undefined)
const eventMenuActivator = ref<HTMLElement | undefined>(undefined)
const editMode = ref(false)
const visibleDates = ref<string[]>([])
const calendar = ref()

// dragState créé ici pour éviter la dépendance circulaire entre useCalendarEvents et useDragResize
const dragState = ref<DragState | null>(null)

const midDate = reactiveSearchParams.start && reactiveSearchParams.end
  ? new Date((new Date(reactiveSearchParams.start).getTime() + new Date(reactiveSearchParams.end).getTime()) / 2)
  : null

const hasUrlNavState = !!(reactiveSearchParams.date || (reactiveSearchParams.start && reactiveSearchParams.end))

const currentDate = ref(
  (config.value.openOnCurrentDay && !hasUrlNavState)
    ? ''
    : (reactiveSearchParams.date as string | undefined) ||
      (midDate ? midDate.toISOString().split('T')[0] : null) ||
        ((dataset.value?.timePeriod as { startDate?: string } | undefined)?.startDate
          ? dayjs((dataset.value!.timePeriod as { startDate: string }).startDate).format('YYYY-MM-DD')
          : '')
)

function toVuetifyView (view: string | undefined): 'month' | 'week' | 'day' | 'planning' {
  const map: Record<string, 'month' | 'week' | 'day' | 'planning'> = {
    dayGridMonth: 'month',
    timeGridWeek: 'week',
    timeGridDay: 'day',
    planning: 'planning',
  }
  return map[view ?? ''] ?? (view as any) ?? 'month'
}

const type = ref<'month' | 'week' | 'day' | 'planning'>(
  toVuetifyView(reactiveSearchParams.view || config.value.initialView)
)
// vuetifyType : valeur passée à v-calendar (ne connaît pas 'planning')
const vuetifyType = computed(() => type.value === 'planning' ? 'month' : type.value)

// Écriture dans l'URL
watch(type, (newType) => { reactiveSearchParams.view = newType })
watch(currentDate, (newDate) => { reactiveSearchParams.date = newDate })

// Flag pour distinguer nos propres écritures sur start/end de celles du parent (iframe)
let calendarIsUpdatingRange = false

// Sync inverse pour le cas iframe (params reçus du parent après le montage)
watch(() => reactiveSearchParams.view as string | undefined, (newView) => {
  if (!newView) return
  const resolved = toVuetifyView(newView)
  if (resolved !== type.value) type.value = resolved
})
watch(() => reactiveSearchParams.date as string | undefined, (newDate) => {
  if (newDate && newDate !== currentDate.value) currentDate.value = newDate
})
// Fallback : si date n'est pas dans l'URL (ancienne URL) mais start/end y sont (sync parent async)
watch([() => reactiveSearchParams.start, () => reactiveSearchParams.end], ([start, end]) => {
  if (calendarIsUpdatingRange || reactiveSearchParams.date || !start || !end) return
  const mid = new Date((new Date(start as string).getTime() + new Date(end as string).getTime()) / 2)
  const midStr = mid.toISOString().split('T')[0]
  if (midStr !== currentDate.value) currentDate.value = midStr
})

const planningTitle = ref('')
const datePickerOpen = ref(false)
const pickerMonth = ref(dayjs().month())
const pickerYear = ref(dayjs().year())

watch([pickerMonth, pickerYear], () => {
  if (type.value === 'month' && datePickerOpen.value) {
    currentDate.value = dayjs().year(pickerYear.value).month(pickerMonth.value).date(1).format('YYYY-MM-DD')
  }
})

const { allEventsRef, selectionEvents, allEventsComputed, splitMultiDayEvent, getColor } =
  useCalendarEvents(dragState, eventMenuOpen, vuetifyType)

const {
  hasDragged, pendingDrag, justDragged, isHoveringResizeZone, lastKnownHour, lastKnownMinute,
  onMouseDownEvent, onMouseMoveEvent, onMouseLeaveEvent, onGlobalMouseMove, finalizeDrag
} =
  useDragResize(dragState, allEventsRef, visibleDates, splitMultiDayEvent, getColor,
    eventMenuOpen, editMode, selectedEvent, eventMenuActivator, vuetifyType)

const { onMouseDownTime: selectionOnMouseDownTime, onMouseMoveTime, finalizeSelection, isSelecting, isPointSelect } =
  useEventSelection(selectionEvents, eventMenuOpen, editMode, selectedEvent, eventMenuActivator, splitMultiDayEvent)

function onMouseDownTime (nativeEvent: Event, { date, time }: { date: string, time: string }) {
  if (layout.value === 'simple') return
  if (eventMenuOpen.value && !pendingDrag.value) return

  if (pendingDrag.value) {
    const pointer = dayjs(`${date} ${time}`)
    const rawEvt = (events.value as Record<string, unknown>[]).find(
      e => (e.originalId ?? e.id) === pendingDrag.value!.originalId
    )
    if (!rawEvt) { pendingDrag.value = null; return }

    const targetEvent = {
      ...rawEvt,
      name: rawEvt.title,
      color: getColor(rawEvt.colorFieldValue as string),
      isDragging: false,
      isPunctual: pendingDrag.value.isPunctual,
    }

    if (eventMenuOpen.value) { eventMenuOpen.value = false; editMode.value = false }

    dragState.value = {
      originalId: pendingDrag.value.originalId,
      mode: pendingDrag.value.mode,
      startPointer: pointer,
      originalStart: pendingDrag.value.originalStart,
      originalEnd: pendingDrag.value.originalEnd,
      targetEvent,
    }
    pendingDrag.value = null
    hasDragged.value = false
    // Initialiser l'heure connue
    const [h, m] = time.split(':').map(Number)
    lastKnownHour.value = h
    lastKnownMinute.value = m
    return
  }

  selectionOnMouseDownTime(nativeEvent, { date, time })
}

function onGlobalMouseUp () {
  if (dragState.value) { finalizeDrag(); return }
  finalizeSelection()
}

function onClickEvent (nativeEvent: Event, payload: { event: Record<string, unknown> }) {
  if ((payload.event.originalId ?? payload.event.id) === '__preview__') return
  if (eventMenuOpen.value && editMode.value) return
  if (justDragged.value) { justDragged.value = false; return }
  if (eventMenuOpen.value && !selectedEvent.value?.id) return
  eventMenuOpen.value = false
  selectedEvent.value = null
  eventMenuActivator.value = nativeEvent.target as HTMLElement
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const event = payload.event
    selectedEvent.value = {
      ...event,
      id: (event.originalId as string) ?? event.id,
      start: event.originalStart ?? event.start,
      end: 'originalEnd' in event ? event.originalEnd : event.end,
    }
    eventMenuOpen.value = true
  }))
}

function onClickDate (nativeEvent: Event, { date }: { date: string }) {
  if (eventMenuOpen.value && editMode.value) return
  if (eventMenuOpen.value) return
  if (layout.value === 'simple') return
  const clickedDay = dayjs(date)
  const min = resolveMinDate()
  const max = resolveMaxDate()
  if (min && clickedDay.isBefore(min, 'day')) return
  if (max && clickedDay.isAfter(max, 'day')) return
  const event: Record<string, unknown> = { start: date, end: date }
  if (startDateField.value && endDateField.value) {
    event[startDateField.value] = date
    event[endDateField.value] = date
  } else if (dateField.value) {
    event[dateField.value] = date
  }
  selectedEvent.value = event
  eventMenuActivator.value = nativeEvent.target as HTMLElement
  requestAnimationFrame(() => requestAnimationFrame(() => { eventMenuOpen.value = true }))
}

function onCalendarChange ({ start, end }: { start: { date: string }, end: { date: string } }) {
  calendarIsUpdatingRange = true

  if (vuetifyType.value === 'day') {
    reactiveSearchParams.start = dayjs(start.date).startOf('day').toISOString()
    reactiveSearchParams.end = dayjs(start.date).endOf('day').toISOString()
    visibleDates.value = [start.date]
    nextTick(() => { calendarIsUpdatingRange = false })
    return
  }

  // dayjs parses date-only strings in local timezone (unlike new Date() which uses UTC)
  let startDate = dayjs(start.date)
  const startDayOfWeek = startDate.day()
  startDate = startDate.subtract(startDayOfWeek === 0 ? 6 : startDayOfWeek - 1, 'day').startOf('day')

  let endDate = dayjs(end.date)
  const endDayOfWeek = endDate.day()
  endDate = endDate.add(endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek, 'day').endOf('day')

  reactiveSearchParams.start = startDate.toISOString()
  reactiveSearchParams.end = endDate.toISOString()
  nextTick(() => { calendarIsUpdatingRange = false })

  const dates: string[] = []
  let cursor = dayjs(start.date)
  const endDayjs = dayjs(end.date)
  while (!cursor.isAfter(endDayjs)) {
    dates.push(cursor.format('YYYY-MM-DD'))
    cursor = cursor.add(1, 'day')
  }
  visibleDates.value = dates
}

function onClickMore (_nativeEvent: Event, { date }: { date: string }) {
  currentDate.value = date
  type.value = 'day'
}

function prev () { calendar.value?.prev() }
function next () { calendar.value?.next() }
function today () { currentDate.value = '' }

function getDayViewDayIndex (event: Record<string, unknown>): number {
  const date = currentDate.value || dayjs().format('YYYY-MM-DD')
  return dayjs(date).diff(dayjs(event.originalStart as string).startOf('day'), 'day') + 1
}

function onClickPlanningEvent (event: Record<string, unknown>, nativeEvent: MouseEvent) {
  selectedEvent.value = event
  eventMenuActivator.value = nativeEvent.target as HTMLElement
  eventMenuOpen.value = false
  requestAnimationFrame(() => requestAnimationFrame(() => {
    eventMenuOpen.value = true
  }))
}

const nowTime = ref(dayjs().format('HH:mm'))
let nowInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (type.value !== 'planning') calendar.value?.checkChange()
  window.addEventListener('mouseup', onGlobalMouseUp)
  window.addEventListener('mousemove', onGlobalMouseMove)
  nowInterval = setInterval(() => { nowTime.value = dayjs().format('HH:mm') }, 60000)
})
onUnmounted(() => {
  window.removeEventListener('mouseup', onGlobalMouseUp)
  window.removeEventListener('mousemove', onGlobalMouseMove)
  if (nowInterval) clearInterval(nowInterval)
})
</script>

<template>
  <v-sheet
    style="display: flex; flex-direction: column; height: 100vh; overflow: hidden"
    :class="{
      'calendar-dragging': dragState?.mode === 'move',
      'calendar-resizing': dragState?.mode === 'resize-start' || dragState?.mode === 'resize-end',
      'calendar-resize-hover': isHoveringResizeZone && !dragState,
      'calendar-selecting': isSelecting || isPointSelect,
    }"
  >
    <v-toolbar flat>
      <v-btn
        variant="outlined"
        :disabled="editMode || type === 'planning'"
        @click="today"
      >
        Aujourd'hui
      </v-btn>

      <v-btn
        :icon="mdiChevronLeft"
        :disabled="editMode || type === 'planning'"
        @click="prev"
      />

      <v-btn
        :icon="mdiChevronRight"
        :disabled="editMode || type === 'planning'"
        @click="next"
      />

      <v-menu
        v-if="type !== 'planning'"
        v-model="datePickerOpen"
        :close-on-content-click="false"
      >
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            variant="text"
            class="text-none px-5"
            style="font-size: 1.25rem; font-weight: 500; letter-spacing: 0;"
            :disabled="editMode"
          >
            {{ calendar?.title }}
          </v-btn>
        </template>
        <v-date-picker
          v-model:month="pickerMonth"
          v-model:year="pickerYear"
          :model-value="currentDate || dayjs().format('YYYY-MM-DD')"
          color="primary"
          show-adjacent-months
          @update:model-value="(date) => { currentDate = date as string; datePickerOpen = false }"
        />
      </v-menu>
      <v-toolbar-title v-else>
        {{ planningTitle }}
      </v-toolbar-title>

      <v-spacer />

      <div class="d-flex mr-2 view-type-toggle">
        <v-btn
          variant="outlined"
          :disabled="editMode"
          :class="{ 'view-type-active': type === 'month' }"
          @click="type = 'month'"
        >
          Mois
        </v-btn>
        <v-btn
          variant="outlined"
          :disabled="editMode"
          :class="{ 'view-type-active': type === 'week' }"
          @click="type = 'week'"
        >
          Semaine
        </v-btn>
        <v-btn
          variant="outlined"
          :disabled="editMode"
          :class="{ 'view-type-active': type === 'day' }"
          @click="type = 'day'"
        >
          Jour
        </v-btn>
        <v-btn
          variant="outlined"
          :disabled="editMode"
          :class="{ 'view-type-active': type === 'planning' }"
          @click="type = 'planning'"
        >
          Planning
        </v-btn>
      </div>
    </v-toolbar>
    <div style="flex: 1 1 auto; min-height: 0; overflow: hidden">
      <planning-view
        v-if="type === 'planning'"
        :get-color="getColor"
        style="height: 100%"
        @click-event="onClickPlanningEvent"
        @title-change="planningTitle = $event"
      />
      <v-calendar
        v-else
        ref="calendar"
        v-model="currentDate"
        :events="allEventsComputed"
        :type="vuetifyType"
        locale="fr"
        data-iframe-height
        event-color="color"
        @click:event="onClickEvent"
        @change="onCalendarChange"
        @click:more="onClickMore"
        @click:date="onClickDate"
        @mousemove:event="onMouseMoveEvent"
        @mouseleave:event="onMouseLeaveEvent"
        @mousedown:event="onMouseDownEvent"
        @mousedown:time="onMouseDownTime"
        @mousemove:time="onMouseMoveTime"
        @mouseup:time="onGlobalMouseUp"
      >
        <template #day-body="scope">
          <div
            v-if="scope.present && (type === 'week' || type === 'day')"
            class="v-current-time"
            :style="{ top: scope.timeToY(nowTime) + 'px' }"
          />
        </template>
        <template #event="{ event }">
          <div
            :data-event-id="event.originalId ?? event.id"
            :style="{
              position: 'relative',
              overflow: 'hidden',
              padding: '0 4px',
              fontSize: '12px',
              height: '100%',
              pointerEvents: event.isDragging ? 'none' : undefined,
            }"
          >
            <template v-if="event.allDay">
              <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                {{ event.name }}<template v-if="(event.dayIndex || event.totalDays) && type === 'day'">
                  · Jour {{ getDayViewDayIndex(event) }}/{{ event.totalDays }}
                </template>
              </div>
            </template>
            <template v-else-if="event.isPunctual">
              <template v-if="type === 'month'">
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">
                  <strong>{{ dayjs((event.isDragging ? event.start : event.originalStart) as string).format('HH:mm') }}</strong> {{ event.name }}
                </span>
              </template>
              <template v-else>
                <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  {{ event.name }}
                </div>
                <div><strong>{{ dayjs((event.isDragging ? event.start : event.originalStart) as string).format('HH:mm') }}</strong></div>
              </template>
            </template>
            <template v-else>
              <template v-if="type === 'month'">
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">
                  <strong>{{ dayjs(event.start as string).format('HH:mm') }}<template v-if="event.end && dayjs(event.end as string).format('HH:mm') !== dayjs(event.start as string).format('HH:mm')"> - {{ dayjs(event.end as string).format('HH:mm') }}</template></strong> {{ event.name }}
                </span>
              </template>
              <template v-else>
                <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  {{ event.name }}
                </div>
                <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  <strong>
                    <template v-if="event.isFirstSegment">{{ dayjs((event.isDragging ? event.segmentActualStart : event.originalStart) as string).format('HH:mm') }}</template>
                    <template v-else-if="event.isLastSegment">Jusqu'à {{ dayjs(event.end as string).format('HH:mm') }}</template>
                    <template v-else>{{ dayjs(event.start as string).format('HH:mm') }} - {{ dayjs(event.end as string).format('HH:mm') }}</template>
                  </strong>
                  <template v-if="event.dayIndex">
                    · Jour {{ event.dayIndex }}/{{ event.totalDays }}
                  </template>
                </div>
              </template>
            </template>
            <div
              v-if="event.editable && !event.allDay && !event.isPunctual && event.isLastSegment !== false"
              class="resize-handle"
              style="position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 2px; align-items: center;"
            >
              <div style="width: 16px; height: 2px; background: rgba(255,255,255,0.7); border-radius: 1px;" />
              <div style="width: 16px; height: 2px; background: rgba(255,255,255,0.7); border-radius: 1px;" />
            </div>
          </div>
        </template>
      </v-calendar>
    </div>
  </v-sheet>
  <v-menu
    :model-value="eventMenuOpen"
    :persistent="editMode"
    :close-on-content-click="false"
    :activator="eventMenuActivator"
    @update:model-value="(val: boolean) => { if (!editMode || val) eventMenuOpen = val }"
  >
    <event-details
      :event="selectedEvent"
      @mode-change="(m: string) => { editMode = m === 'edit' }"
      @updated="eventMenuOpen = false; editMode = false"
      @cancel="eventMenuOpen = false; editMode = false"
      @close="eventMenuOpen = false; editMode = false"
    />
  </v-menu>
</template>

<style>
.v-calendar-weekly__day.v-outside .v-calendar-weekly__day-label button { opacity: 0.4; }
.v-calendar-weekly__day-label { cursor: default; }
.v-calendar-daily_head-day-label { cursor: default; }
.v-calendar-daily_head-weekday { cursor: default; }
.v-calendar-weekly__week:last-child { border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
.v-theme--dark .v-calendar-weekly__day.v-outside { background-color: rgb(var(--v-theme-background)); }
.v-theme--dark .v-calendar-weekly__head-weekday.v-outside { background-color: rgb(var(--v-theme-background)); }
.v-calendar-weekly__day.v-present { background-color: rgba(var(--v-theme-primary), 0.1); }
.v-calendar-daily_head-day.v-present { background-color: rgba(var(--v-theme-primary), 0.1); }
.v-calendar-daily__day.v-present { background-color: rgba(var(--v-theme-primary), 0.1); }
.view-type-toggle > .v-btn { border-radius: 0 !important; }
.view-type-toggle > .v-btn + .v-btn { margin-left: -1px; }
.view-type-toggle > .v-btn:first-child { border-radius: 4px 0 0 4px !important; }
.view-type-toggle > .v-btn:last-child { border-radius: 0 4px 4px 0 !important; }
.view-type-active { background-color: rgb(var(--v-theme-primary)) !important; color: rgb(var(--v-theme-on-primary)) !important; border-color: rgb(var(--v-theme-primary)) !important; position: relative; z-index: 1; }
.calendar-dragging, .calendar-resizing, .calendar-selecting { user-select: none; }
.v-calendar .v-event-timed { min-height: 40px; }
.calendar-dragging .v-calendar, .calendar-dragging .v-calendar * { cursor: grabbing !important; }
.calendar-resizing .v-calendar, .calendar-resizing .v-calendar * { cursor: ns-resize !important; }
.calendar-resize-hover .v-calendar, .calendar-resize-hover .v-calendar * { cursor: ns-resize !important; }
.v-current-time { position: absolute; left: 0; right: 0; height: 2px; background-color: rgb(var(--v-theme-error)); pointer-events: none; z-index: 2; }
.v-current-time::before { content: ''; position: absolute; left: -4px; top: -4px; width: 10px; height: 10px; border-radius: 50%; background-color: rgb(var(--v-theme-error)); }
.v-calendar .resize-handle { opacity: 0; transition: opacity 0.15s; }
.v-calendar .v-event-timed:hover .resize-handle { opacity: 1; }
.calendar-dragging .resize-handle, .calendar-resizing .resize-handle { opacity: 0 !important; }
</style>
