<script setup>
import { ref } from 'vue'
import useAppInfo from '@/composables/useAppInfo'
import { ofetch } from 'ofetch'
import { errorMessage, displayError } from '@/context'
const { contribUrl } = useAppInfo()
const prop = defineProps({
  selectedContrib: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['refuse'])
const refuseMenu = ref(false)
async function refuseContrib () {
  const formData = new FormData()
  formData.append('validation_status', 'refused')
  formData.append('validation_date', new Date().toISOString())
  try {
    const param = {
      method: 'PATCH',
      body: formData
    }
    await ofetch(contribUrl + '/lines/' + prop.selectedContrib.id, param)
    emit('refuse', prop.selectedContrib.extendedProps.target_id)
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e.data
    displayError.value = true
  }
  refuseMenu.value = false
}
</script>
<template>
  <v-menu
    v-model="refuseMenu"
    :close-on-content-click="false"
    :close-on-click="false"
    min-width="300px"
    max-width="500px"
  >
    <template #activator="{ props }">
      <v-btn
        v-tooltip="{
          text: 'Refuser la contribution',
          location: 'right',
          openDelay:'500'
        }"
        icon="mdi-calendar-remove"
        color="red"
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
        Refuser la demande
      </v-card-title>
      <v-card-text>
        <v-alert
          :model-value="true"
          type="error"
        >
          Voulez vous vraiment refuser la demande ?
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          text
          @click="refuseMenu = false"
        >
          Annuler
        </v-btn>
        <v-btn
          color="red"
          @click="refuseContrib"
        >
          Refuser
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
