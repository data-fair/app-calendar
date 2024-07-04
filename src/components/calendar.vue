<script setup>
import FullCalendar from '@fullcalendar/vue3'
import { getData } from '@/context'
import { computedAsync } from '@vueuse/core'
import { useTheme } from 'vuetify'
import { reactive, ref, watch } from 'vue'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
// import interactionPlugin from '@fullcalendar/interaction'
import frLocale from '@fullcalendar/core/locales/fr'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
const theme = useTheme()
const dateBegin = ref(reactiveSearchParams.date === undefined ? new Date() : new Date(reactiveSearchParams.date))
const dateEnd = ref(new Date(dateBegin.value.getTime() + 6 * 7 * 24 * 60 * 60 * 1000))
const resolveView = function (view) {
  if (view === 'dayGridMonth') return 'Mois'
  if (view === 'timeGridWeek') return 'Semaine'
  if (view === 'timeGridDay') return 'Jour'
  if (view === 'listMonth') return 'Liste'
}
const view = ref(reactiveSearchParams.view === undefined ? 'Mois' : resolveView(reactiveSearchParams.view))

const changeTimePeriod = function (date, view) {
  reactiveSearchParams.date = date
  if (view === 'Mois' || view === 'Liste') {
    // add 6 weeks
    dateBegin.value = date
    dateEnd.value = new Date(dateBegin.value.getTime() + 6 * 7 * 24 * 60 * 60 * 1000)
  } else if (view === 'Semaine') {
    // add 7 days
    dateBegin.value = date
    dateEnd.value = new Date(dateBegin.value.getTime() + 7 * 24 * 60 * 60 * 1000)
  } else if (view === 'Jour') {
    // add 24 hours
    dateBegin.value = date
    dateEnd.value = new Date(dateBegin.value.getTime() + 24 * 60 * 60 * 1000)
  }
}
const calendar = ref(null)
const selectedEvent = ref(null)
const menuActivator = ref(null)

const menu = ref(false)
const events = computedAsync(async () => {
  const events = await getData(dateBegin.value, dateEnd.value, theme)
  return events
}, null, null)
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
        const date = calendar.value.calendar.getDate()
        changeTimePeriod(date, view.value)
      },
      icon: 'chevron-left'
    },
    nextButton: {
      click: function (e) {
        calendar.value.calendar.next()
        reactiveSearchParams.view = calendar.value.calendar.currentData.currentViewType
        const date = calendar.value.calendar.getDate()
        changeTimePeriod(date, view.value)
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
  events,
  locale: frLocale,
  height: '100%',
  eventClick: function handleClickEvent (e) {
    selectedEvent.value = e.event
    menuActivator.value = e.el
    menu.value = true
  }
})
watch(view, () => {
  if (view.value === 'Mois') {
    calendar.value.calendar.changeView('dayGridMonth')
    reactiveSearchParams.view = 'dayGridMonth'
    const date = calendar.value.calendar.getDate()
    changeTimePeriod(date, view.value)
  }
  if (view.value === 'Semaine') {
    calendar.value.calendar.changeView('timeGridWeek')
    reactiveSearchParams.view = 'timeGridWeek'
    const date = calendar.value.calendar.getDate()
    changeTimePeriod(date, view.value)
  }
  if (view.value === 'Jour') {
    calendar.value.calendar.changeView('timeGridDay')
    reactiveSearchParams.view = 'timeGridDay'
    const date = calendar.value.calendar.getDate()
    changeTimePeriod(date, view.value)
  }
  if (view.value === 'Liste') {
    calendar.value.calendar.changeView('listMonth')
    reactiveSearchParams.view = 'listMonth'
    const date = calendar.value.calendar.getDate()
    changeTimePeriod(date, view.value)
  }
})
</script>
<template>
  <v-select
    v-model="view"
    :style="{
      position: 'absolute',
      width: '10em',
      right:'20px',
    }"
    class="pt-2"
    density="comfortable"
    variant="outlined"
    :items="['Mois','Semaine','Jour','Liste']"
  />
  <full-calendar
    ref="calendar"
    :options="calendarOptions"
  >
    <template #eventContent="arg">
      <b>{{ arg.timeText }}</b>
      {{ arg.event.title }}
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
        Fin : {{ selectedEvent?.end.toLocaleString() }}
      </v-card-text>
      <v-card-actions>
        <v-btn
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
</style>
