<script setup>
import FullCalendar from '@fullcalendar/vue3'
import { getData } from '@/context'
import { computedAsync } from '@vueuse/core'
import { useTheme } from 'vuetify'
import { reactive, ref, watch } from 'vue'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import frLocale from '@fullcalendar/core/locales/fr'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
import useAppInfo from '@/composables/useAppInfo'
import { getParams, getColor } from '@/assets/util'
const { dataUrl, isRest, categoryField, color } = useAppInfo()
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
const check = ref(false)
const displayError = ref(false)
const errorMessage = ref('')
const newEvent = reactive({
  hoursStart: '00:00',
  hoursEnd: '00:00'
})
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
  } else if (view === 'timeGridDay' || view === 'dayGridDay') dateEnd.value = new Date(dateBegin.value.getTime() + 24 * 60 * 60 * 1000) // add 24 hours
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
    newEvent.hoursStart = e.event.start.getHours().toString().padStart(2, '0') + ':' + e.event.start.getMinutes().toString().padStart(2, '0')
    newEvent.hoursEnd = e.event.end.getHours().toString().padStart(2, '0') + ':' + e.event.end.getMinutes().toString().padStart(2, '0')
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
if (isRest !== undefined) { // options for edit mode, user can do all CRUD operations on calendar
  calendarOptions.plugins.push(interactionPlugin)
  calendarOptions.editable = true // event can be moved
  calendarOptions.eventResizableFromStart = true
  calendarOptions.selectable = true
  calendarOptions.select = function (e) { // work when select dates (no when click on event)
    newEvent.db = e.start
    newEvent.df = e.end
    newEvent.hoursStart = e.start.getHours().toString().padStart(2, '0') + ':' + e.start.getMinutes().toString().padStart(2, '0')
    newEvent.hoursEnd = e.end.getHours().toString().padStart(2, '0') + ':' + e.end.getMinutes().toString().padStart(2, '0')
    newEvent.cat = undefined
    newEvent.allDay = e.allDay
    post.value = true
  }
  calendarOptions.eventDrop = async function (e) {
    const obj = {
      db: e.event.start,
      df: e.event.end,
      id: e.event.id
    }
    if (e.oldEvent.allDay && !e.event.allDay) { // if we drag from the allDay zone to non allDay, default duration is one hour
      obj.df = new Date(e.event.start)
      obj.df.setHours(e.event.start.getHours() + 1)
    }
    try {
      await patchEvent(obj)
    } catch (r) {
      e.revert()
      displayError.value = true
      errorMessage.value = r.message
    }
  }
  calendarOptions.eventResize = async function (e) {
    const obj = {
      db: e.event.start,
      df: e.event.end,
      id: e.event.id
    }
    try {
      await patchEvent(obj)
    } catch (r) {
      e.revert()
      displayError.value = true
      errorMessage.value = r.message
    }
  }
}
async function postEvent () {
  const tab1 = newEvent.hoursStart.split(':')
  const tab2 = newEvent.hoursEnd.split(':')
  newEvent.db.setHours(tab1[0], tab1[1])
  newEvent.df.setHours(tab2[0], tab2[1])
  console.log(newEvent)
  const url = `${dataUrl}/lines`
  const evt = {}
  evt[paramField.value.startDate] = newEvent.db
  evt[paramField.value.endDate] = newEvent.df
  evt[paramField.value.description] = newEvent.desc || ''
  evt[paramField.value.label] = newEvent.lib || ''
  if (newEvent.cat !== undefined) evt[paramField.value.category] = newEvent.cat
  const params = {
    method: 'POST',
    body: JSON.stringify(evt),
    headers: {
      'Content-type': 'application/json'
    }
  }
  const request = await fetch(url, params)
  if (request.ok) {
    const reponse = await request.json()
    const obj = {
      id: reponse._id,
      title: reponse[paramField.value.label],
      start: reponse[paramField.value.startDate],
      end: reponse[paramField.value.endDate],
      allDay: newEvent.allDay
    }
    obj.description = newEvent.desc || ''
    if (color.type === 'monochrome') {
      obj.color = color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
    } else {
      const colors = await getColor(newEvent.cat)
      obj.color = colors[newEvent.cat]
    }
    calendar.value.calendar.addEvent(obj)
    newEvent.cat = undefined
    newEvent.lib = undefined
    newEvent.desc = undefined
  }
}
async function deleteEvent (id) {
  const url = `${dataUrl}/lines/${id}`
  const params = {
    method: 'DELETE'
  }
  const request = await fetch(url, params)
  if (request.ok) {
    const event = calendar.value.calendar.getEventById(id)
    event.remove()
  } else {
    errorMessage.value = 'Erreur suppression'
    displayError.value = true
  }
}
async function patchEvent (payload) {
  const { db, df, id } = payload
  const url = `${dataUrl}/lines/${id}`
  const formData = new FormData()
  formData.append(paramField.value.startDate, db.toISOString())
  formData.append(paramField.value.endDate, df.toISOString())
  const param = {
    method: 'PATCH',
    body: formData
  }
  const request = await fetch(url, param)
  if (!request.ok) throw new Error('Erreur modification événement')
  newEvent.cat = undefined
  newEvent.lib = undefined
  newEvent.desc = undefined
}
async function patchParamEvent () {
  const url = `${dataUrl}/lines/${selectedEvent.value.id}`
  const tab1 = newEvent.hoursStart.split(':')
  const tab2 = newEvent.hoursEnd.split(':')
  selectedEvent.value.start.setHours(tab1[0], tab1[1])
  selectedEvent.value.end.setHours(tab2[0], tab2[1])
  const formData = new FormData()
  formData.append(paramField.value.startDate, selectedEvent.value.start.setHours(tab1[0], tab1[1]).toISOString())
  formData.append(paramField.value.endDate, selectedEvent.value.end.setHours(tab2[0], tab2[1]).toISOString())
  // todo add lib and cat
  const param = {
    method: 'PATCH',
    body: formData
  }
  const request = await fetch(url, param)
  if (!request.ok) throw new Error('Erreur modification événement')
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
        class="px-2 py-1 justify-space-between"
        :style="{
          minHeight : '30px'
        }"
      >
        <v-btn
          density="default"
          @click="menu = false"
        >
          Fermer
        </v-btn>
        <v-icon
          v-if="isRest"
          icon="mdi-pencil"
          class="mr-2"
          @click="menu=false, patch = true"
        />
        <v-icon
          v-if="isRest"
          icon="mdi-delete"
          color="red"
          class="mr-2"
          @click="deleteEvent(selectedEvent?.id), menu=false"
        />
      </v-card-actions>
    </v-card>
  </v-menu>
  <v-menu
    v-model="post"
    :close-on-content-click="false"
    offset-y
    :style="{
      justifyContent : 'center',
      alignItems : 'center'
    }"
  >
    <v-card
      class="pa-3"
      :style="{width: '20em'
      }"
    >
      <div class="text-h6 text-center pb-2">
        Ajouter un évènement
      </div>
      <v-text-field
        v-model="newEvent.hoursStart"
        label="Horaire de début"
        type="time"
        :prefix="newEvent.db.toLocaleDateString()"
      />
      <v-text-field
        v-model="newEvent.hoursEnd"
        label="Horaire de fin"
        type="time"
        :prefix="newEvent.df.toLocaleDateString()"
      />
      <v-text-field
        v-model="newEvent.lib"
        type="text"
        label="Libellé"
      />
      <v-text-field
        v-model="newEvent.desc"
        type="text"
        label="Description"
      />
      <v-checkbox
        v-model="check"
        label="Ajouter une catégorie ?"
        hide-details
      />
      <div
        v-if="check"
        class="d-flex"
      >
        <div
          v-if="categoryField === undefined"
          :style="{
            color: 'red'
          }"
        >
          Veuillez séléctionner le champ catégorie dans la configuration
        </div>
        <v-text-field
          v-else
          v-model="newEvent.cat"
          class="pl-2"
          label="Catégorie"
        />
      </div>
      <div class="d-flex justify-space-between">
        <v-btn
          v-if="check && categoryField === undefined"
          variant="plain"
          readonly="true"
        >
          Ajouter
        </v-btn>
        <v-btn
          v-else
          @click="postEvent(),post = false"
        >
          Ajouter
        </v-btn>
        <v-btn
          @click="post = false"
        >
          Annuler
        </v-btn>
      </div>
    </v-card>
  </v-menu>
  <v-menu
    v-model="patch"
    :close-on-content-click="false"
    offset-y
    :style="{
      justifyContent : 'center',
      alignItems : 'center'
    }"
  >
    <v-card
      class="pa-3"
      :style="{width: '20em'
      }"
    >
      <div class="text-h6 text-center pb-2">
        Modifier l'événement
      </div>
      <v-text-field
        v-model="newEvent.hoursStart"
        label="Horaire de début"
        type="time"
        :prefix="selectedEvent.start.toLocaleDateString()"
      />
      <v-text-field
        v-model="newEvent.hoursEnd"
        label="Horaire de fin"
        type="time"
        :prefix="selectedEvent.end.toLocaleDateString()"
      />
      <v-text-field
        v-model="newEvent.lib"
        type="text"
        label="Libellé"
      />
      <v-checkbox
        v-model="check"
        label="Ajouter une catégorie ?"
        hide-details
      />
      <div
        v-if="check"
        class="d-flex"
      >
        <div
          v-if="categoryField === undefined"
          :style="{
            color: 'red'
          }"
        >
          Veuillez séléctionner le champ catégorie dans la configuration
        </div>
        <v-text-field
          v-else
          v-model="newEvent.cat"
          class="pl-2"
          label="Catégorie"
        />
      </div>
      <div class="d-flex justify-space-between">
        <v-btn
          v-if="check && categoryField === undefined"
          variant="plain"
          readonly="true"
        >
          Ajouter
        </v-btn>
        <v-btn
          v-else
          @click="patchParamEvent(selectedEvent),patch = false"
        >
          Ajouter
        </v-btn>
        <v-btn
          @click="patch = false"
        >
          Annuler
        </v-btn>
      </div>
    </v-card>
  </v-menu>
  <v-snackbar
    v-model="displayError"
    :timeout="'5000'"
    color="red"
  >
    <div>
      {{ errorMessage }}
    </div>
  </v-snackbar>
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
</style>
