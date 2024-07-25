<script setup>
import { getData, displayError, errorMessage } from '@/context'
import { computedAsync } from '@vueuse/core'
import { useTheme, useDisplay } from 'vuetify'
import { ofetch } from 'ofetch'
import { reactive, ref, watch, onMounted } from 'vue'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
import useAppInfo from '@/composables/useAppInfo'
import { formatDate } from '@/assets/util'
import EditEvent from './events/EditEvent.vue'
import ThumbnailEvent from './events/ThumbnailEvent.vue'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import frLocale from '@fullcalendar/core/locales/fr'
import FullCalendar from '@fullcalendar/vue3'
import EditContrib from './contribs/EditContribution.vue'
import ThumbnailContrib from './contribs/ThumbnailContribution'
const { dataUrl, isRest, startDate, evtDate, endDate, layout, contribUrl } = useAppInfo()
const { height } = useDisplay()
const theme = useTheme()
const dateBegin = ref(reactiveSearchParams.date === undefined ? new Date() : new Date(reactiveSearchParams.date))
dateBegin.value.setDate(1)
const dateEnd = ref(new Date(dateBegin.value.getTime() + 31 * 24 * 60 * 60 * 1000))
const calendar = ref(null)
const selectedEvent = ref(null)
const selectedContrib = ref(null)
const thumbnailContribActivator = ref(null)
const thumbnailEventActivator = ref(null)
const thumbnailC = ref(false)
const thumbnailE = ref(false)
const edition = reactive({ // control display of both edit menus
  contrib: false,
  event: false,
  operation: null
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
  height,
  eventClick: function (e) {
    if (e.event.extendedProps.contrib) {
      selectedContrib.value = e.event
      thumbnailContribActivator.value = e.el
      thumbnailC.value = true
    } else {
      selectedEvent.value = e.event
      thumbnailE.value = true
      thumbnailEventActivator.value = e.el
    }
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
if (isRest && layout !== 'simple') { // options for edit mode, user can do operations on calendar (only on event which 'editable' property is set to true)
  calendarOptions.plugins.push(interactionPlugin)
  calendarOptions.editable = true
  calendarOptions.eventResizableFromStart = true
  calendarOptions.selectable = true
  calendarOptions.select = function (e) { // call when selecting a zone
    if (layout === 'edit') { edition.contrib = true; selectedContrib.value = e } else { edition.event = true; selectedEvent.value = e }
    edition.operation = 'post'
  }
  calendarOptions.eventDrop = async function (e) {
    selectedEvent.value = e.event
    selectedContrib.value = e.event
    if (e.oldEvent.allDay && !e.event.allDay) { // if we drag from the allDay zone to non allDay, default duration is one hour
      if (!startDate) e.event.setAllDay(true) // if time period doesn't exist, event remains all day
      else {
        const d = e.event.start
        d.setHours(e.event.start.getHours() + 1)
        selectedEvent.value.setEnd(d)
        selectedContrib.value.setEnd(d)
      }
    }
    try {
      if (layout === 'edit') await patchContribCalendar()
      else await patchEventCalendar()
    } catch (r) {
      e.revert()
      displayError.value = true
      errorMessage.value = r.status + ' - ' + r.data
    }
  }
  calendarOptions.eventResize = async function (e) {
    if (layout === 'edit') selectedContrib.value = e.event
    else selectedEvent.value = e.event
    try {
      if (layout === 'edit') await patchContribCalendar()
      else await patchEventCalendar()
    } catch (r) {
      e.revert()
      displayError.value = true
      errorMessage.value = r.status + ' - ' + r.data
    }
  }
}
function addCalendarEvent (newEvent) {
  // add newEvent to calendar with calendar's addEvent method
  // newEvent can also be a contrib
  edition.contrib = false
  edition.event = false
  if (newEvent) {
    calendar.value.calendar.addEvent(newEvent)
  }
}
// those 2 patch are executed when we drag and drop or resize event in the calendar
async function patchEventCalendar () {
  const event = selectedEvent.value
  const formData = new FormData()
  if (startDate && endDate) {
    formData.append(endDate, event.end.toISOString())
    formData.append(startDate, event.start.toISOString())
    if (evtDate) formData.append(evtDate, formatDate(event.start))
  } else {
    formData.append(evtDate || startDate, evtDate ? formatDate(event.start) : event.start.toISOString())
  }
  const param = {
    method: 'PATCH',
    body: formData
  }
  await ofetch(dataUrl + '/lines/' + selectedEvent.value.id, param)
}
async function patchContribCalendar () {
  const contrib = selectedEvent.value
  const url = contribUrl + '/lines/' + selectedEvent.value.id
  const request = await ofetch(url)
  const newEvent = JSON.parse(request.update)
  if (startDate) {
    newEvent[startDate] = contrib.start
    newEvent[endDate] = contrib.end
  } else {
    newEvent[evtDate] = contrib.start
  }
  const formData = new FormData()
  formData.append('update', JSON.stringify(newEvent))
  const param = {
    method: 'PATCH',
    body: formData
  }
  await ofetch(url, param)
}
// handle which action was done on contrib or event thumbnails
// content : Object (the new Event to add)
// operation : String
function thumbnailAction (operation, content) {
  thumbnailE.value = false
  thumbnailC.value = false
  if (operation === 'patch') {
    edition.event = true
    edition.operation = operation
  }
  if (operation === 'patch-contrib') {
    edition.contrib = true
    edition.operation = operation
  }
  if (operation === 'create') addCalendarEvent(content)
}
function actionButton () {
  const d = new Date()
  let defaultTimeStamp = {}
  if (startDate) {
    defaultTimeStamp = {
      start: d,
      end: new Date(d.getTime() + 1000 * 60 * 60), // default duration is one hour
      allDay: false,
      menu: true // indicate we show date picker on edit menu
    }
  } else {
    defaultTimeStamp = {
      start: d,
      end: null,
      allDay: true,
      menu: true // indicate we show date picker on edit menu
    }
  }
  if (layout === 'edit') {
    edition.contrib = true
    selectedContrib.value = defaultTimeStamp
  } else {
    edition.event = true
    selectedEvent.value = defaultTimeStamp
  }
  edition.operation = 'post'
}
onMounted(() => {
  // modification initiale de la largeur de la colonne des heures
  const calendarEl = calendar.value.$el
  const colGroup = calendarEl.querySelector('.fc-view-harness')
  if (colGroup) {
    const cols = colGroup.querySelectorAll('col')
    cols.forEach(col => {
      col.style.width = '70px'
    })
  }
})
</script>
<template>
  <v-btn
    v-if="isRest && layout !=='simple'"
    v-tooltip="{
      text: `Ajouter ${layout === 'edit' ? 'une contribution' : 'un événement'}`,
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
    @click="actionButton"
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
    v-model="thumbnailE"
    :close-on-content-click="false"
    :activator="thumbnailEventActivator"
    offset-y
  >
    <thumbnail-event
      :selected-event="selectedEvent"
      @thumb-action="thumbnailAction"
    />
  </v-menu>
  <v-menu
    v-model="thumbnailC"
    :close-on-content-click="false"
    :activator="thumbnailContribActivator"
    offset-y
  >
    <thumbnail-contrib
      :selected-contrib="selectedContrib"
      @thumb-action="thumbnailAction"
    />
  </v-menu>
  <suspense>
    <edit-event
      v-if="edition.event"
      :selected-event="selectedEvent"
      :operation="edition.operation"
      @edit-action="addCalendarEvent"
    />
  </suspense>
  <suspense>
    <edit-contrib
      v-if="edition.contrib"
      :selected-contrib="selectedContrib"
      :operation="edition.operation"
      @edit-action="addCalendarEvent"
    />
  </suspense>
</template>
<style>
.fc-icon::before{
  padding-bottom : 7px !important
}
.fc-button-primary{ /* style for buttons*/
  background-color: #1e88e5 !important;
  margin-right: 4px !important;
  border-radius: 7px !important;
  border: 0px !important
}
.fc-toolbar-title{ /* center the title dates*/
  padding-right: 7em
}
.fc-daygrid-event{
  min-height: 10px; /* min height for a event with no label and no overflow on next case*/
  overflow: hidden
}
.fc-event-main{
  overflow: hidden
}
.fc .fc-timegrid-axis-cushion{
  max-width: 70px /* 'Toute la journée' is written in 2 lines instead of 3*/
}
.contribution{
  opacity: 0.75;
  border: 2px dashed rgb(255, 255, 255)!important;
  background-color: rgb(122,169,92); /*set background-color for month view to identify contrib because event-color doesn't appear on month view*/
}
.font{ /*thumbnail text display*/
  font-size: 0.95em;
}
.font-key{
  font-size: 1.1em;
  font-weight: 500;
  color :rgb(92, 85, 85)
}
</style>
