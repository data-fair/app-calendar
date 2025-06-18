<script setup>
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import frLocale from '@fullcalendar/core/locales/fr'
import { reactive, ref, computed } from 'vue'
import { useTheme } from 'vuetify'
import { events, colorPalette, timestamp } from '@/context'
import { errorMessage, displayError } from '@/messages'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import useAppInfo from '@/composables/useAppInfo'
import EventDetails from './events/EventDetails.vue'
import { ofetch } from 'ofetch'
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import { dateFromConfig } from '@/assets/utils'

const theme = useTheme()
const { config, color, mainDataset, layout, startDateField, endDateField, dateField, endDateType } = useAppInfo()
const { dayjs } = useLocaleDayjs()

const selectedEvent = ref(null)
const eventMenuOpen = ref(null)
const eventMenuActivator = ref(null)

reactiveSearchParams.view = reactiveSearchParams.view || config.initialView || 'dayGridMonth'

function getColor (value) {
  if (color.type === 'monochrome') {
    return color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
  } else {
    return colorPalette.value[value]
  }
}

const allEvents = computed(() => {
  return (events.value || []).map(e => ({ ...e, color: getColor(e.colorFieldValue) }))
})

async function patchEvent (event) {
  const body = {}
  if (startDateField && endDateField) {
    body[startDateField] = event.start.toISOString()
    body[endDateField] = event.end.toISOString()
  } else if (dateField) {
    body[dateField] = event.start.toISOString()
  }
  try {
    await ofetch(`${mainDataset.href}/lines/${event.originalId}`, { method: 'PATCH', body })
    eventMenuOpen.value = false
    timestamp.value = new Date().getTime()
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e._data
    displayError.value = true
  }
}

const midDate = reactiveSearchParams.start && reactiveSearchParams.end && new Date((new Date(reactiveSearchParams.start).getTime() + new Date(reactiveSearchParams.end).getTime()) / 2)

const calendarOptions = reactive({
  plugins: [dayGridPlugin, interactionPlugin, timeGridPlugin, listPlugin],
  initialView: reactiveSearchParams.view || 'dayGridMonth',
  initialDate: config.openOnCurrentDay ? new Date() : (midDate && new Date(midDate)) || (mainDataset.timePeriod?.startDate && new Date(mainDataset.timePeriod.startDate)),
  locale: frLocale,
  headerToolbar: {
    start: 'prev,next today',
    center: 'title',
    end: 'dayGridMonth,timeGridWeek,timeGridDay,listNextYear'
  },
  views: {
    listNextYear: {
      type: 'list',
      visibleRange: {
        start: dateFromConfig(dayjs, 'day'),
        end: dateFromConfig(dayjs, 'one-year-later')
      },
      buttonText: 'Planning'
    }
  },
  events: allEvents,
  selectable: layout !== 'simple',
  selectConstraint: {
    start: dateFromConfig(dayjs, config.minDate),
    end: dayjs(dateFromConfig(dayjs, config.maxDate)).add(1, 'day').format('YYYY-MM-DD')
  },
  datesSet (dateInfo) {
    reactiveSearchParams.start = dateInfo.startStr
    reactiveSearchParams.end = dateInfo.endStr
    reactiveSearchParams.view = dateInfo.view.type
  },
  eventClick (e) {
    e.jsEvent.preventDefault()
    const event = e.event.toJSON()
    selectedEvent.value = { ...event, ...event.extendedProps }
    delete selectedEvent.value.extendedProps
    setTimeout(() => {
      eventMenuOpen.value = true
    }, 0)
    eventMenuActivator.value = e.el
  },
  eventDrop (e) {
    patchEvent(e.event)
  },
  eventResize (e) {
    patchEvent(e.event)
  },
  select (e) {
    if (eventMenuOpen.value) return
    const event = {}
    if (startDateField && endDateField) {
      event[startDateField] = e.start.toISOString()
      event[endDateField] = e.end.toISOString()
      if (endDateType !== 'date-time') {
        event[endDateField] = dayjs(event[endDateField]).subtract(1, 'day').toISOString()
      }
    } else if (dateField) event[dateField] = e.start.toISOString()
    selectedEvent.value = event
    eventMenuActivator.value = e.jsEvent.toElement.parentElement.parentElement
    eventMenuOpen.value = true
  }
})
</script>

<template>
  <FullCalendar
    :options="calendarOptions"
    data-iframe-height
  />
  <v-menu
    v-model="eventMenuOpen"
    :persistent="layout === 'admin'"
    :close-on-content-click="false"
    :activator="eventMenuActivator"
    :location="reactiveSearchParams.view === 'dayGridMonth' ? 'bottom' : 'start center'"
  >
    <event-details
      :event="selectedEvent"
      @updated="eventMenuOpen = false"
      @close="eventMenuOpen = false"
    />
  </v-menu>
</template>

<style>
.fc .fc-button.fc-button-primary {
    background-color:v-bind(theme.current.value.colors.primary);
    border-color:v-bind(theme.current.value.colors.primary);
}

.fc .fc-button.fc-button-primary.fc-button-active {
    background-color:v-bind(theme.current.value.colors.secondary);
    border-color:v-bind(theme.current.value.colors.secondary);
}

.fc-event {
    cursor: pointer;
}
</style>
