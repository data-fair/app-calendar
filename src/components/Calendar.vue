<script setup>
import { getData, displayError, errorMessage } from '@/context'
import { computedAsync } from '@vueuse/core'
import { useTheme } from 'vuetify'
import { ofetch } from 'ofetch'
import { reactive, ref, watch } from 'vue'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
import useAppInfo from '@/composables/useAppInfo'
import { formatDate } from '@/assets/util'
import EditEvent from './EditEvent.vue'
import ThumbnailEvent from './ThumbnailEvent.vue'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import frLocale from '@fullcalendar/core/locales/fr'
import FullCalendar from '@fullcalendar/vue3'
const { dataUrl, isRest, label, startDate, evtDate, endDate, description } = useAppInfo()
const theme = useTheme()
const dateBegin = ref(reactiveSearchParams.date === undefined ? new Date() : new Date(reactiveSearchParams.date))
dateBegin.value.setDate(1) // necessary to handle display order : day -> month -> refresh page
const dateEnd = ref(new Date(dateBegin.value.getTime() + 31 * 24 * 60 * 60 * 1000))
const calendar = ref(null)
const selectedEvent = ref(null)
const thumbnailActivator = ref(null)
const thumbnail = ref(false)
const action = reactive({
  activate: false,
  type: null
})
const items = [{ // list of different display modes
  title: 'Mois',
  value: 'dayGridMonth'
},
{
  title: 'Semaine',
  value: 'timeGridWeek'
},
{
  title: 'Jour',
  value: 'timeGridDay'
},
{
  title: 'Liste',
  value: 'listMonth'
}]
const events = computedAsync(async () => {
  const events = await getData(dateBegin.value, dateEnd.value, theme)
  return events
}, null, {
  onError: function (e) {
    displayError.value = true
    errorMessage.value = e.message
  }
})
watch(reactiveSearchParams, () => { // watch which period and which view is displayed to get data in precise range
  calendar.value.calendar.changeView(reactiveSearchParams.view)
  dateBegin.value = new Date(reactiveSearchParams.date)
  const view = reactiveSearchParams.view
  if (view === 'dayGridMonth' || view === 'listMonth') {
    // add 31 days
    dateBegin.value.setDate(1) // go to first day of the month
    dateEnd.value = new Date(dateBegin.value.getTime() + 31 * 24 * 60 * 60 * 1000)
  } else if (view === 'timeGridWeek') {
    // add 7 days
    dateBegin.value.setDate(dateBegin.value.getDate() - dateBegin.value.getUTCDay()) // go to monday
    dateEnd.value = new Date(dateBegin.value.getTime() + 7 * 24 * 60 * 60 * 1000)
  } else if (view === 'timeGridDay') dateEnd.value = new Date(dateBegin.value.getTime() + 24 * 60 * 60 * 1000) // add 24 hours
})

const calendarOptions = reactive({ // standard options for the calendar, allows to use the calendar in read only mode
  plugins: [
    dayGridPlugin,
    timeGridPlugin,
    listPlugin
  ],
  customButtons: {
    prevButton: {
      click: function (e) {
        calendar.value.calendar.prev()
        reactiveSearchParams.view = calendar.value.calendar.currentData.currentViewType
        reactiveSearchParams.date = calendar.value.calendar.getDate()
      },
      icon: 'chevron-left'
    },
    nextButton: {
      click: function (e) {
        calendar.value.calendar.next()
        reactiveSearchParams.view = calendar.value.calendar.currentData.currentViewType
        reactiveSearchParams.date = calendar.value.calendar.getDate()
      },
      icon: 'chevron-right'
    },
    today: {
      click: function (e) {
        calendar.value.calendar.today()
        reactiveSearchParams.view = calendar.value.calendar.currentData.currentViewType
        reactiveSearchParams.date = new Date()
      },
      text: 'Aujourd\'hui'
    }
  },
  headerToolbar: {
    start: 'prevButton,nextButton today',
    center: 'title',
    end: ''
  },
  initialView: reactiveSearchParams.view || 'dayGridMonth',
  initialDate: !reactiveSearchParams.date ? new Date() : new Date(reactiveSearchParams.date),
  dayMaxEvents: true, // limit number of displayed events in one cell
  fixedWeekCount: false,
  showNonCurrentDates: false,
  events,
  locale: frLocale,
  height: window.innerHeight,
  eventClick: function (e) {
    selectedEvent.value = e.event
    thumbnailActivator.value = e.el
    thumbnail.value = true
  },
  moreLinkClick: function (e) {
    calendar.value.calendar.gotoDate(e.date)
    reactiveSearchParams.date = e.date
    reactiveSearchParams.view = 'timeGridDay'
  },
  navLinks: true,
  weekNumbers: true,
  navLinkDayClick: function (date, jsEvent) {
    calendar.value.calendar.gotoDate(date)
    reactiveSearchParams.date = date
    reactiveSearchParams.view = 'timeGridDay'
  },
  navLinkWeekClick: function (date, jsEvent) {
    calendar.value.calendar.gotoDate(date)
    reactiveSearchParams.date = date
    reactiveSearchParams.view = 'timeGridWeek'
  }
})
if (isRest !== undefined) { // options for edit mode, user can do all CRUD operations on calendar
  calendarOptions.plugins.push(interactionPlugin)
  calendarOptions.editable = true
  calendarOptions.eventResizableFromStart = true
  calendarOptions.selectable = true
  calendarOptions.select = function (e) { // call when selecting a zone
    selectedEvent.value = e
    action.activate = true
    action.type = 'post'
  }
  calendarOptions.eventDrop = async function (e) {
    selectedEvent.value = e.event
    if (e.oldEvent.allDay && !e.event.allDay) { // if we drag from the allDay zone to non allDay, default duration is one hour
      if (!startDate) e.event.setAllDay(true) // if time period doesn't exist, event remains all day
      else {
        const d = selectedEvent.value.start
        d.setHours(selectedEvent.value.start.getHours() + 1)
        selectedEvent.value.setEnd(d)
      }
    }
    try {
      await patchEventCalendar()
    } catch (r) {
      e.revert()
      displayError.value = true
      errorMessage.value = r.status + ' - ' + r.data
    }
  }
  calendarOptions.eventResize = async function (e) {
    selectedEvent.value = e.event
    try {
      await patchEventCalendar()
    } catch (r) {
      e.revert()
      displayError.value = true
      errorMessage.value = r.status + ' - ' + r.data
    }
  }
}

async function deleteEvent (id) {
  const url = `${dataUrl}/lines/${id}`
  const params = {
    method: 'DELETE'
  }
  try {
    await ofetch(url, params)
    const event = calendar.value.calendar.getEventById(id)
    event.remove()
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e._data
    displayError.value = true
  }
}
async function patchEventCalendar () {
  const event = selectedEvent.value
  const url = `${dataUrl}/lines`
  const formData = new FormData()
  if (event.end && startDate) {
    formData.append(endDate, event.end.toISOString())
    formData.append(startDate, event.start.toISOString())
  } else {
    formData.append(evtDate || startDate, evtDate ? formatDate(event.start) : event.start.toISOString())
  }
  formData.append(label, event.title)
  for (const field in event.extendedProps) {
    if (field !== 'description') formData.append(field, event.extendedProps[field])
  }
  if (event.extendedProps.description) formData.append(description, event.extendedProps.description || '')
  formData.append('_id', event.id)
  formData.append('_action', 'update')
  const param = {
    method: 'POST',
    body: formData
  }
  await ofetch(url, param)
}
function addEventButton () {
  const d = new Date()
  if (startDate) {
    selectedEvent.value = {
      start: d,
      end: new Date(d.getTime() + 1000 * 60 * 60), // default duration is one hour
      allDay: false,
      menu: true
    }
  } else {
    selectedEvent.value = {
      start: d,
      end: null,
      allDay: true,
      menu: true
    }
  }
  action.activate = true
  action.type = 'post'
}
function addCalendarEvent (newEvent) {
  action.activate = false
  if (newEvent) calendar.value.calendar.addEvent(newEvent)
}
function thumbnailAction (value) {
  thumbnail.value = false
  if (value === 'patch') { action.activate = true; action.type = 'patch' }
  if (value === 'delete') deleteEvent(selectedEvent.value.id)
}

</script>
<template>
  <v-btn
    v-if="isRest"
    v-tooltip="{
      text: 'Ajouter un événement',
      location: 'left',
      openDelay:'500'
    }"
    density="default"
    class="elevation-5 bg-blue-darken-1 mt-2"
    :style="{
      position: 'absolute',
      right: '11em',
      fontSize:'20px'
    }"
    color="white"
    icon="mdi-calendar-plus"
    @click="addEventButton"
  />
  <v-select
    v-model="reactiveSearchParams.view"
    :style="{
      position: 'absolute',
      width: '10em',
      right:'20px',
    }"
    class="pt-2"
    variant="outlined"
    :items="items"
    label="Affichage"
  />
  <full-calendar
    ref="calendar"
    :options="calendarOptions"
  >
    <template #eventContent="evt">
      <b>{{ evt.timeText }}&nbsp;</b>
      <br v-if="evt.timeText">
      {{ evt.event.title }}
    </template>
  </full-calendar>
  <v-menu
    v-model="thumbnail"
    :close-on-content-click="false"
    :activator="thumbnailActivator"
    offset-y
  >
    <thumbnail-event
      :selected-event="selectedEvent"
      @action-menu="thumbnailAction"
    />
  </v-menu>
  <suspense>
    <edit-event
      v-if="action.activate"
      :selected-event="selectedEvent"
      :param="action.type"
      @close-post="addCalendarEvent"
    />
  </suspense>
</template>
<style>
.fc-icon::before{
  padding-bottom : 7px !important
}
.fc-button-primary{
  background-color: #1e88e5 !important;
  margin-right: 4px !important;
  border-radius: 7px !important;
  border: 0px !important
}
.fc-toolbar-title{
  padding-right: 7em
}
.fc-popover{
  z-index: 1000 !important
}
.v-overlay__content{
  min-width: 20px !important
}
.fc-daygrid-event{
  min-height: 10px;
}
.fc-scrollgrid-shrink{
  height: 40px !important;
}
.fc-scrollgrid-shrink-frame{
  overflow: hidden
}
.menu{
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%,-50%);
  z-index: 2000;
  width: 22em
}
.fc-timegrid-slot{
  height: 1.5em !important;
}
.fc-daygrid-event-harness{
  overflow: hidden
}
</style>
