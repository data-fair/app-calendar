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
import { getData, displayError, errorMessage } from '@/context'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
import useAppInfo from '@/composables/useAppInfo'
import EventDetails from './events/EventDetails.vue'

const theme = useTheme()
const { mainDataset } = useAppInfo()

const selectedEvent = ref(null)
const eventMenuOpen = ref(null)
const eventMenuActivator = ref(null)

reactiveSearchParams.view = reactiveSearchParams.view || 'dayGridMonth'

const events = computedAsync(async () => {
  return await getData(theme)
}, null, {
  onError: function (e) {
    displayError.value = true
    errorMessage.value = e.message
  }
})

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
  events,
  datesSet (dateInfo) {
    reactiveSearchParams.start = dateInfo.startStr
    reactiveSearchParams.end = dateInfo.endStr
    reactiveSearchParams.view = dateInfo.view.type
  },
  eventClick: function (e) {
    e.jsEvent.preventDefault()
    selectedEvent.value = e.event
    setTimeout(() => {
      eventMenuOpen.value = true
    }, 0)
    eventMenuActivator.value = e.el
  }
})

</script>

<template>
  <FullCalendar :options="calendarOptions" />
  <v-menu
    v-model="eventMenuOpen"
    :close-on-content-click="false"
    :activator="eventMenuActivator"
    offset-y
  >
    <event-details
      :event="selectedEvent"
      @deleted="eventMenuOpen = false"
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
