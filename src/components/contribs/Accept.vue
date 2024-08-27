<script setup>
import { ref } from 'vue'
import { errorMessage, displayError } from '@/context'
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import { useTheme } from 'vuetify'
import { getColor } from '@/assets/util'
const { config, mainDataset, contribsDataset, labelField, dateField, startDateField, endDateField, descriptionField, color } = useAppInfo()
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
    const request = await ofetch(`${contribsDataset?.href}/lines/${prop.selectedContrib.id}`, param)
    const formDataEvent = new FormData()
    for (const [key, value] of Object.entries(JSON.parse(request.update))) {
      formDataEvent.append(key, value)
    }
    param.method = 'POST'
    param.body = formDataEvent
    const reponse = await ofetch(mainDataset.href + '/lines', param)
    const newEvent = {
      id: reponse._id,
      title: reponse[labelField] || '',
      start: reponse[startDateField] || reponse[dateField],
      end: reponse[endDateField],
      allDay: reponse[dateField] ? true : prop.selectedContrib.allDay
    }
    newEvent.description = reponse[descriptionField] || ''
    if (color.type === 'multicolor') {
      const colors = await getColor(reponse[color.field])
      newEvent.color = colors[reponse[color.field]]
      newEvent[color.field] = reponse[color.field]
    } else newEvent.color = color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
    for (const field of config.thumbnailFields) {
      newEvent[field] = reponse[field]
    }
    // todo notify contribution's owner
    prop.selectedContrib.remove()
    emit('accept', newEvent)
    acceptMenu.value = false
    if (config.deleteValidatedContribs) {
      await ofetch(`${contribsDataset?.href}/lines/${prop.selectedContrib.id || 0}`, { method: 'DELETE' })
    }
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
