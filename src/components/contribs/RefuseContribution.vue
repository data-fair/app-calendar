<script setup>
import { ref } from 'vue'
import useAppInfo from '@/composables/useAppInfo'
import { errorMessage, displayError, timestamp } from '@/context'
import { ofetch } from 'ofetch'

const { contribsDataset, config } = useAppInfo()

const refuseMenuOpen = ref(false)

const prop = defineProps({
  event: {
    type: [Object, null],
    required: true
  }
})

const emit = defineEmits(['refused'])

async function refuseContribution () {
  const url = `${contribsDataset.href}/lines/${prop.event.id}`
  const params = {
    method: config.deleteModeratedContribs ? 'DELETE' : 'PATCH'
  }
  if (!config.deleteModeratedContribs) params.body = { status: 'refused' }
  try {
    await ofetch(url, params)
    refuseMenuOpen.value = false
    emit('refused')
    timestamp.value = new Date().getTime()
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e._data
    displayError.value = true
  }
}
</script>

<template>
  <v-menu
    v-model="refuseMenuOpen"
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
          openDelay: '500'
        }"
        icon="mdi-close"
        color="error"
        v-bind="props"
      />
    </template>
    <v-card
      outlined
      data-iframe-height
    >
      <v-card-title primary-title>
        Refuser la contribution ?
      </v-card-title>
      <v-card-text>
        <v-alert
          :model-value="true"
          type="error"
        >
          Voulez vous vraiment refuser la contribution ?
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          text
          @click="refuseMenuOpen = false"
        >
          Annuler
        </v-btn>
        <v-btn
          color="error"
          @click="refuseContribution()"
        >
          Refuser
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
