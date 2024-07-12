<script setup>
import Vjsf from '@koumoul/vjsf'
import { ref, reactive } from 'vue'
import { getParams, getColor, formatHours } from '@/assets/util'
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import { displayError, errorMessage } from '@/context'
const { dataUrl } = useAppInfo()
const { startDate, endDate, label, description, category, additionalParams } = await getParams()
const props = defineProps({
  selectedEvent: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['close-patch'])
const newEvent = reactive({
  hoursStart: formatHours(props.selectedEvent.start),
  hoursEnd: formatHours(props.selectedEvent.end || new Date()),
  db: props.selectedEvent.start,
  df: props.selectedEvent.end
})
const options = {
  density: 'compact',
  locale: 'fr'
}
const data = ref(null)
async function patchParamEvent () { // patch an event via the menu
  const event = props.selectedEvent
  const url = `${dataUrl}/lines/${event.id}`
  const tab1 = newEvent.hoursStart.split(':')
  const tab2 = newEvent.hoursEnd.split(':')
  const t1 = event.start
  t1.setHours(tab1[0], tab1[1])
  const formData = new FormData()
  let t2
  // we cant patch the hour of a non-timed event so we necessarily patch startDate field if date has changed
  if (t1.getTime() !== event.start.getTime()) formData.append(startDate, t1.toISOString())
  if (event.end) {
    t2 = event.end
    t2.setHours(tab2[0], tab2[1])
    formData.append(endDate, t2.toISOString())
  }
  for (const [key, value] of Object.entries(data.value)) {
    formData.append(key, value)
  }
  const param = {
    method: 'PATCH',
    body: formData
  }
  try {
    await ofetch(url, param)
    props.selectedEvent.setStart(t1)
    if (event.end) event.setEnd(t2)
    if (data.value[label]) props.selectedEvent.setProp('title', data.value[label])
    if (data.value[description]) props.selectedEvent.setExtendedProp('description', data.value[description])
    if (data.value[category]) {
      const colors = await getColor(data.value[category])
      props.selectedEvent.setProp('color', colors[data.value[category]])
    }
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e.data
    displayError.value = true
  }
  emit('close-patch')
}
</script>
<template>
  <v-card
    class="pa-3"
    :style="{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: '2000',
      width:'22em',
    }"
  >
    <div class="text-h6 text-center pb-2">
      Modifier un événement
    </div>
    <v-text-field
      v-if="newEvent.df"
      v-model="newEvent.hoursStart"
      label="Horaire de début"
      type="time"
      density="comfortable"
      :prefix="newEvent.db?.toLocaleDateString()"
    />
    <v-text-field
      v-if="!props.selectedEvent.allDay"
      v-model="newEvent.hoursEnd"
      label="Horaire de fin"
      density="comfortable"
      type="time"
      :prefix="newEvent.df?.toLocaleDateString()"
    />
    <vjsf
      v-model="data"
      :schema="additionalParams"
      :options="options"
    />
    <div class="d-flex justify-space-between mt-3">
      <v-btn
        class="ml-3"
        @click="patchParamEvent()"
      >
        Ajouter
      </v-btn>
      <v-btn
        class="mr-3"
        @click="emit('close-patch')"
      >
        Annuler
      </v-btn>
    </div>
  </v-card>
</template>
