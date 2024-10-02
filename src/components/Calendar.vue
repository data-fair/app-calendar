<script setup>
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import frLocale from '@fullcalendar/core/locales/fr'
import { reactive, ref } from 'vue'
import { computedAsync } from '@vueuse/core'
import { useTheme } from 'vuetify'
import { events, colorPalette, timestamp } from '@/context'
import { errorMessage, displayError } from '@/messages'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
import useAppInfo from '@/composables/useAppInfo'
import EventDetails from './events/EventDetails.vue'
import { ofetch } from 'ofetch'
import { useSession } from '@data-fair/lib/vue/session.js'

const session = useSession()
const theme = useTheme()
const { config, color, mainDataset, contribsDataset, layout, startDateField, endDateField, dateField, labelField } = useAppInfo()

const selectedEvent = ref(null)
const eventMenuOpen = ref(null)
const eventMenuActivator = ref(null)

reactiveSearchParams.view = reactiveSearchParams.view || 'dayGridMonth'

function getColor (value) {
  if (color.type === 'monochrome') {
    return color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
  } else {
    return colorPalette.value[value]
  }
}

const operationLabel = {
  create: 'Ajout',
  update: 'Modification',
  delete: 'Suppression'
}

const allEvents = computedAsync(async () => {
  const mainEvents = (events.value || []).map(e => ({ ...e, color: getColor(e.colorFieldValue) }))
  if (config.crowdSourcing && (layout === 'admin' || (layout === 'contrib' && !config.hideContribs))) {
    const params = {
      _c_date_match: reactiveSearchParams.start + ',' + reactiveSearchParams.end,
      size: 1000,
      t: timestamp.value
    }
    const response = await ofetch(`${contribsDataset.href + (layout === 'contrib' ? `/own/user:${session?.state?.user?.id}` : '')}/lines`, { params })
    const contribEvents = response.results.map(event => {
      const payload = JSON.parse(event.payload || '{}')
      if (event._attachment_url) payload._attachment_url = event._attachment_url
      const original = event.original ? JSON.parse(event.original) : undefined
      return {
        editable: layout === 'contrib',
        isContrib: true,
        operation: event.operation,
        status: event.status,
        _owner: event._owner,
        _ownerName: event._ownerName,
        id: event._id,
        target_id: event.target_id,
        payload,
        attachmentPath: event.attachmentPath,
        original,
        title: `${payload[labelField]} - ${operationLabel[event.operation]}`,
        color: config.colorContrib,
        start: payload[startDateField && endDateField ? startDateField : dateField],
        end: startDateField && endDateField ? payload[endDateField] : undefined,
        allDay: !(startDateField && endDateField) || (new Date(event.end).getTime() - new Date(event.start).getTime() > 2 * 24 * 60 * 60 * 1000)
      }
    })
    return [...mainEvents, ...contribEvents]
  } else return mainEvents
}, null, {
  onError: function (e) {
    displayError.value = true
    errorMessage.value = e.message
  }
})

async function patchEvent (event) {
  const body = {}
  if (startDateField && endDateField) {
    body[event.extendedProps?.isContrib ? 'start' : startDateField] = event.start.toISOString()
    body[event.extendedProps?.isContrib ? 'end' : endDateField] = event.end.toISOString()
  } else if (dateField) {
    body[event.extendedProps?.isContrib ? 'start' : dateField] = event.start.toISOString()
    if (event.extendedProps?.isContrib) body.end = event.end.toISOString()
  }
  const url = `${event.extendedProps?.isContrib ? (contribsDataset.href + `/own/${event.extendedProps?._owner}`) : mainDataset.href}/lines/${event.id}`
  const params = {
    method: 'PATCH',
    body
  }
  try {
    await ofetch(url, params)
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
  initialDate: (midDate && new Date(midDate)) || (mainDataset.timePeriod?.startDate && new Date(mainDataset.timePeriod.startDate)) || new Date(),
  locale: frLocale,
  headerToolbar: {
    start: 'prev,next today',
    center: 'title',
    end: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
  },
  events: allEvents,
  selectable: layout !== 'simple',
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
    const event = {}
    if (layout !== 'contrib') {
      if (startDateField && endDateField) {
        event[startDateField] = e.start.toISOString()
        event[endDateField] = e.end.toISOString()
      } else if (dateField) event[dateField] = e.start.toISOString()
    } else {
      event.isContrib = true
      event.operation = 'create'
      event.status = 'submitted'
      event.start = e.start.toISOString()
      event.end = e.end.toISOString()
      const user = session?.state?.user
      if (user) {
        event._owner = 'user:' + user.id
        event._ownerName = user.name
      }
    }
    selectedEvent.value = event
    eventMenuActivator.value = e.jsEvent.target
    eventMenuOpen.value = true
  }
})
</script>

<template>
  <FullCalendar :options="calendarOptions" />
  <v-menu
    v-model="eventMenuOpen"
    :close-on-content-click="false"
    :activator="eventMenuActivator"
    :location="reactiveSearchParams.view === 'dayGridMonth' ? 'bottom' : 'start center'"
  >
    <event-details
      :event="selectedEvent"
      @updated="eventMenuOpen = false"
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
