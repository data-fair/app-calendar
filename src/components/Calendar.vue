<script setup>
import { getData, displayError, errorMessage } from '@/context'
import { computedAsync } from '@vueuse/core'
import { useTheme } from 'vuetify'
import { ofetch } from 'ofetch'
import { reactive, ref, watch } from 'vue'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
import useAppInfo from '@/composables/useAppInfo'
import { getParams, formatDate } from '@/assets/util'
import AddEvent from './AddEvent.vue'
import PatchEvent from './PatchEvent.vue'
import MenuEvent from './MenuEvent.vue'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import frLocale from '@fullcalendar/core/locales/fr'
import FullCalendar from '@fullcalendar/vue3'
const { dataUrl, isRest } = useAppInfo()
const theme = useTheme()
const dateBegin = ref(reactiveSearchParams.date === undefined ? new Date() : new Date(reactiveSearchParams.date))
dateBegin.value.setDate(1) // necessary to handle display order : day -> month -> refresh page
const dateEnd = ref(new Date(dateBegin.value.getTime() + 31 * 24 * 60 * 60 * 1000))
const calendar = ref(null)
const selectedEvent = ref(null)
const menuActivator = ref(null)
const menu = ref(false)
const post = ref(false)
const patch = ref(false)
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
const paramField = computedAsync(async () => { return await getParams() }, null)
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
  height: '100%',
  eventClick: function (e) {
    selectedEvent.value = e.event
    menuActivator.value = e.el
    menu.value = true
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
  calendarOptions.select = function (e) { // call when selectiong a zone
    selectedEvent.value = e
    post.value = true
  }
  calendarOptions.eventDrop = async function (e) {
    selectedEvent.value = e.event
    if (e.oldEvent.allDay && !e.event.allDay) { // if we drag from the allDay zone to non allDay, default duration is one hour
      if (!paramField.value.startDate) e.event.setAllDay(true) // if time period doesn't exist, event remains all day
      else {
        const d = selectedEvent.value.start
        d.setHours(selectedEvent.value.start.getHours() + 1)
        selectedEvent.value.setEnd(d)
      }
    }
    try {
      await patchEventCalendar()
    } catch (r) {
      console.log(r)
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
async function patchEventCalendar () { // patch event by resizing or moving it, we do a post with _action param to create a new entry, necessary when we witch between timed and non-timed events
  const event = selectedEvent.value
  const params = paramField.value
  const url = `${dataUrl}/lines`
  const formData = new FormData()
  if (event.end && params.startDate) {
    formData.append(params.endDate, event.end.toISOString())
    formData.append(params.startDate, event.start.toISOString())
  } else {
    formData.append(params.evtDate || params.startDate, params.evtDate ? formatDate(event.start) : event.start.toISOString())
  }
  formData.append(params.label, event.title)
  if (event.extendedProps.category) formData.append(params.category, event.extendedProps.category)
  if (event.extendedProps.description) formData.append(params.description, event.extendedProps.description)
  formData.append('_id', event.id)
  formData.append('_acton', 'update')
  const param = {
    method: 'POST',
    body: formData
  }
  await ofetch(url, param)
}
function menuAction (action) {
  menu.value = false
  if (action === 'patch') patch.value = true
  if (action === 'delete') deleteEvent(selectedEvent.value.id)
}
function addCalendarEvent (event) {
  post.value = false
  if (event) calendar.value.calendar.addEvent(event)
}
</script>
<template>
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
    v-model="menu"
    :close-on-content-click="false"
    :activator="menuActivator"
    offset-y
  >
    <menu-event
      :selected-event="selectedEvent"
      @action-menu="menuAction"
    />
  </v-menu>
  <suspense>
    <add-event
      v-if="post"
      :selected-event="selectedEvent"
      @close-post="addCalendarEvent"
    />
  </suspense>
  <suspense>
    <patch-event
      v-if="patch"
      :selected-event="selectedEvent"
      @close-patch="patch = false"
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
</style>
