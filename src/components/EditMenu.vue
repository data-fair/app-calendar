<script setup>
import Vjsf from '@koumoul/vjsf'
import { reactive } from 'vue'
import { getSchema, formatHours, formatDate } from '@/assets/util'
import { VDateInput } from 'vuetify/labs/VDateInput'
import useAppInfo from '@/composables/useAppInfo'
import { ofetch } from 'ofetch'
import { computedAsync } from '@vueuse/core'
const { evtDate, startDate, endDate, dataUrl, contribUrl } = useAppInfo()
const { schema } = await getSchema()
const props = defineProps({
  selectedEvent: {
    type: Object,
    required: true
  },
  operation: {
    type: String,
    required: true
  }
})
const emit = defineEmits(['submit', 'close'])
// pre-fill the field of vjsf if we do a patch
const data = computedAsync(async () => {
  const temp = {}
  if (props.operation.match('patch')) {
    const reponse = await ofetch(`${props.operation === 'patch-event' ? dataUrl : contribUrl}/lines/${props.selectedEvent.id}`)
    const event = reponse.update ? JSON.parse(reponse.update) : reponse
    for (const f in schema.properties) {
      temp[f] = event[f]
    }
    temp.comment = reponse.comment
    temp.user_name = reponse.user_name
  }
  return temp
})
const eventTimeRange = reactive({
  hoursStart: formatHours(props.selectedEvent.start),
  hoursEnd: props.selectedEvent.end ? formatHours(props.selectedEvent.end) : formatHours(new Date()),
  date_begin: props.selectedEvent.start,
  date_end: props.selectedEvent.end
})
// options of vjsf form
const options = {
  density: 'compact',
  locale: 'fr'
}
// add contributions fields to vjsf schema
if (props.operation.match('contrib')) {
  schema.properties.comment = {
    title: 'Commentaire de contribution',
    type: 'string',
    'x-originalName': 'description',
    layout: 'textarea'
  }
  schema.properties.user_name = {
    title: 'Nom du contributeur',
    type: 'string',
    'x-originalName': 'description',
    maxLength: 200
  }
}
const operationDisplay = {
  'post-event': ['Ajouter', 'Ajouter un événement'],
  'patch-event': ['Modifier', 'Modifier un événement'],
  'post-contrib': ['Ajouter', 'Ajouter une contribution'],
  'patch-contrib': ['Modifier', 'Modifier la contribution']
}
function buildResult () { // build contrib or event depending on operation
  const contrib = { event: {} }
  for (const [key, value] of Object.entries(data.value)) {
    if (key === 'comment') contrib.comment = value
    else if (key === 'user_name') contrib.user_name = value
    else contrib.event[key] = value
  }
  const tab1 = eventTimeRange.hoursStart.split(':')
  const tab2 = eventTimeRange.hoursEnd?.split(':')
  eventTimeRange.date_begin.setHours(tab1[0], tab1[1])
  eventTimeRange.date_end?.setHours(tab2[0], tab2[1])
  if (props.selectedEvent.allDay) {
    contrib.event[startDate || evtDate] = startDate ? eventTimeRange.date_begin.toISOString() : formatDate(eventTimeRange.date_begin)
    if (startDate) contrib.event[endDate] = eventTimeRange.date_end.toISOString()
  } else {
    if (startDate) {
      contrib.event[startDate] = eventTimeRange.date_begin.toISOString()
      contrib.event[endDate] = eventTimeRange.date_end.toISOString()
    } else {
      contrib.event[evtDate] = formatDate(eventTimeRange.date_begin)
    }
  }
  if (props.operation.match('event')) emit('submit', contrib.event)
  else emit('submit', contrib)
}
</script>
<template>
  <v-card
    class="pa-3"
    :style="{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%,-50%)',
      zIndex: '2000',
      width: '22em',
      maxHeight: '85vh',
      overflow: 'auto'}"
  >
    <div class="text-h6 text-center pb-2">
      {{ operationDisplay[operation][1] }}
    </div>
    <div
      v-if="props.selectedEvent.menu"
      class="d-flex"
      :style="{
        position: 'relative',
      }"
    >
      <v-date-input
        v-model="eventTimeRange.date_begin"
        label="Date de début"
        width="100%"
        density="comfortable"
      />
      <v-text-field
        v-if="startDate"
        v-model="eventTimeRange.hoursStart"
        :style="{
          position: 'absolute',
          right: '0'
        }"
        label="Horaire de début"
        type="time"
        density="comfortable"
        width="45%"
      />
    </div>
    <v-text-field
      v-else-if="startDate"
      v-model="eventTimeRange.hoursStart"
      label="Horaire de début"
      density="comfortable"
      type="time"
      :prefix="eventTimeRange.date_begin?.toLocaleDateString()"
    />
    <div
      v-if="props.selectedEvent.menu && props.selectedEvent.end"
      class="d-flex"
      :style="{
        position: 'relative',
      }"
    >
      <v-date-input
        v-model="eventTimeRange.date_end"
        label="Date de fin"
        width="100%"
        density="comfortable"
      />
      <v-text-field
        v-model="eventTimeRange.hoursEnd"
        :style="{
          position: 'absolute',
          right: '0'
        }"
        label="Horaire de début"
        type="time"
        density="comfortable"
        width="45%"
      />
    </div>
    <v-text-field
      v-if="!props.selectedEvent.allDay && !props.selectedEvent.menu && startDate"
      v-model="eventTimeRange.hoursEnd"
      label="Horaire de fin"
      density="comfortable"
      type="time"
      :prefix="eventTimeRange.date_end?.toLocaleDateString()"
    />
    <vjsf
      v-model="data"
      :schema="schema"
      :options="options"
    />
    <div class="d-flex justify-space-between mt-3">
      <v-btn
        class="ml-3"
        @click="buildResult"
      >
        {{ operationDisplay[operation][0] }}
      </v-btn>
      <v-btn
        class="mr-3"
        @click="emit('close')"
      >
        Annuler
      </v-btn>
    </div>
  </v-card>
</template>
