<script setup>
import FullCalendar from '@fullcalendar/vue3'
import { getData } from '@/context'
import { computedAsync } from '@vueuse/core'
import { useTheme } from 'vuetify'
import { reactive, ref, watch } from 'vue'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import frLocale from '@fullcalendar/core/locales/fr'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
const theme = useTheme()
const dateBegin = ref(reactiveSearchParams.date === undefined ? new Date() : new Date(reactiveSearchParams.date))
dateBegin.value.setDate(1) // necessary to handle display order : day -> month -> refresh page
const dateEnd = ref(new Date(dateBegin.value.getTime() + 31 * 24 * 60 * 60 * 1000))
const calendar = ref(null)
const selectedEvent = ref(null)
const menuActivator = ref(null)
const menu = ref(false)
const items = [{
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
}, null, null)
watch(reactiveSearchParams, () => {
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
  } else if (view === 'timeGridDay' || view === 'dayGridDay') dateEnd.value = new Date(dateBegin.value.getTime() + 24 * 60 * 60 * 1000) // add 24 hours
})

const calendarOptions = reactive({
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
    }
  },
  headerToolbar: {
    start: 'prevButton,nextButton today',
    center: 'title',
    end: ''
  },
  initialView: reactiveSearchParams.view || 'dayGridMonth',
  initialDate: reactiveSearchParams.date === undefined ? new Date() : new Date(reactiveSearchParams.date),
  dayMaxEvents: true, // limit number of displayed events
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
    reactiveSearchParams.view = 'dayGridDay'
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
      <b>{{ evt.timeText }}</b>
      {{ evt.event.title }}
    </template>
  </full-calendar>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    :activator="menuActivator"
    offset-y
  >
    <v-card>
      <v-card-text class="pb-0">
        <v-icon
          class="pr-3"
          :style="{
            color: `${selectedEvent?.backgroundColor}`
          }"
          icon="mdi-calendar"
        /><span class="text-subtitle-1 font-weight-medium">{{ selectedEvent?.title }}</span>
        <br>
        Debut : {{ selectedEvent?.start.toLocaleString() }}
        <br>
        <span v-if="selectedEvent?.end">Fin : {{ selectedEvent?.end.toLocaleString() }}</span>
        <br>
        Description : <span
          class="d-inline"
          v-html="selectedEvent?.extendedProps.description"
        />
      </v-card-text>
      <v-card-actions
        class="px-2 py-1"
        :style="{
          minHeight : '30px'
        }"
      >
        <v-btn
          density="compact"
          @click="menu = false"
        >
          Fermer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
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
</style>
