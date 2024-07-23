<script setup>
import { ref } from 'vue'
import { errorMessage, displayError } from '@/context'
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import { useTheme } from 'vuetify'
const { dataUrl, contribUrl, label, evtDate, startDate, endDate, description, color, thumbnailFields } = useAppInfo()
const theme = useTheme()
const prop = defineProps({
  selectedContrib: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['accept'])
const acceptMenu = ref(false)
async function acceptContrib () {
  const formData = new FormData()
  formData.append('validation_status', 'validated')
  formData.append('validation_date', new Date().toISOString())
  const param = {
    method: 'PATCH',
    body: formData
  }
  try {
    const request = await ofetch(`${contribUrl}/lines/${prop.selectedContrib.id}`, param)
    if (request.operation === 'create') {
      const formDataEvent = new FormData()
      for (const [key, value] of Object.entries(JSON.parse(request.update))) {
        formDataEvent.append(key, value)
      }
      param.method = 'POST'
      param.body = formDataEvent
      const reponse = await ofetch(dataUrl + '/lines', param)
      const newEvent = {
        id: reponse._id,
        title: reponse[label],
        start: reponse[startDate] || reponse[evtDate],
        end: reponse[endDate],
        allDay: reponse[evtDate] ? true : prop.selectedContrib.allDay
      }
      newEvent.description = reponse[description] || ''
      newEvent.color = color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
      for (const field of thumbnailFields) {
        newEvent[field] = reponse[field]
      }
      emit('accept', 'create', newEvent)
    } else if (request.operation === 'update') {
      const formDataEvent = new FormData()
      for (const [key, value] of Object.entries(JSON.parse(request.update))) {
        formDataEvent.append(key, value)
      }
      param.method = 'PATCH'
      param.body = formDataEvent
      const reponse = await ofetch(dataUrl + '/lines/' + request.target_id, param)
      const newEvent = {
        id: reponse._id,
        title: reponse[label],
        start: reponse[startDate] || reponse[evtDate],
        end: reponse[endDate],
        allDay: reponse[evtDate] ? true : prop.selectedContrib.allDay
      }
      newEvent.description = reponse[description] || ''
      newEvent.color = color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
      for (const field of thumbnailFields) {
        newEvent[field] = reponse[field]
      }
      emit('accept', 'create', newEvent) // previous event is overwritten
    } else if (request.operation === 'delete') {
      emit('accept', 'delete', request.target_id)
    }
    acceptMenu.value = false
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e.data
    displayError.value = true
  }
}
</script>
<template>
  <v-menu
    v-model="acceptMenu"
    :close-on-content-click="false"
    :close-on-click="false"
    min-width="300px"
    max-width="500px"
  >
    <template #activator="{ props }">
      <v-btn
        v-tooltip="{
          text: 'Accepter la contribution',
          location: 'right',
          openDelay:'500'
        }"
        icon="mdi-calendar-check"
        color="success"
        v-bind="props"
      />
    </template>
    <v-card
      outlined
      data-iframe-height
    >
      <v-card-title
        primary-title
      >
        Accepter la demande
      </v-card-title>
      <v-card-text>
        <v-alert
          :model-value="true"
          type="success"
        >
          Voulez vous vraiment accepter la demande ?
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          text
          @click="acceptMenu = false"
        >
          Annuler
        </v-btn>
        <v-btn
          color="success"
          @click="acceptContrib"
        >
          Accepter
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
