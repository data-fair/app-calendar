<script setup>
import Vjsf from '@koumoul/vjsf'
import { ref, reactive } from 'vue'
import { getParams, getColor, formatHours, formatDate } from '@/assets/util'
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import { useTheme } from 'vuetify'
import { displayError, errorMessage } from '@/context'
const theme = useTheme()
const { dataUrl, color } = useAppInfo()
const { startDate, endDate, evtDate, label, description, category, additionalParams } = await getParams()
const props = defineProps({
  selectedEvent: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['close-post'])

const newEvent = reactive({
  hoursStart: formatHours(props.selectedEvent.start),
  hoursEnd: formatHours(props.selectedEvent.end),
  db: props.selectedEvent.start,
  df: props.selectedEvent.end
})
const options = {
  density: 'compact',
  locale: 'fr'
}
const data = ref(null)
async function postEvent () {
  const tab1 = newEvent.hoursStart.split(':')
  const tab2 = newEvent.hoursEnd.split(':')
  newEvent.db.setHours(tab1[0], tab1[1])
  newEvent.df.setHours(tab2[0], tab2[1])
  const formData = new FormData()
  // fill right fields depending on concepts that are used
  // if both concepts are used, timed-format is prioritized
  if (props.selectedEvent.allDay) {
    formData.append(startDate || evtDate, startDate ? newEvent.db.toISOString() : formatDate(newEvent.db))
    if (startDate) formData.append(endDate, newEvent.df.toISOString())
  } else {
    if (startDate) {
      formData.append(startDate, newEvent.db.toISOString())
      formData.append(endDate, newEvent.df.toISOString())
    } else {
      formData.append(evtDate, newEvent.db)
    }
  }
  for (const [key, value] of Object.entries(data.value)) {
    formData.append(key, value)
  }
  const param = {
    method: 'POST',
    body: formData
  }
  try {
    const reponse = await ofetch(dataUrl + '/lines', param)
    const obj = {
      id: reponse._id,
      title: reponse[label],
      start: reponse[evtDate] || reponse[startDate],
      end: reponse[endDate],
      allDay: reponse[evtDate] ? true : props.selectedEvent.allDay
    }
    obj.description = data.value[description]
    if (color.type === 'monochrome') {
      obj.color = color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
    } else {
      const colors = await getColor(data.value[category])
      obj.color = colors[data.value[category]]
    }
    emit('close-post', obj)
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e.data
    displayError.value = true
  }
}
</script>
<template>
  <v-card
    class="pa-3 menu"
  >
    <div class="text-h6 text-center pb-2">
      Ajouter un événement
    </div>
    <v-text-field
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
        @click="postEvent()"
      >
        Ajouter
      </v-btn>
      <v-btn
        class="mr-3"
        @click="emit('close-post')"
      >
        Annuler
      </v-btn>
    </div>
  </v-card>
</template>
