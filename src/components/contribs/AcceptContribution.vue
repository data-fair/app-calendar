<script setup>
import { ref } from 'vue'
import useAppInfo from '@/composables/useAppInfo'
import { timestamp } from '@/context'
import { errorMessage, displayError } from '@/messages'
import { ofetch } from 'ofetch'

const { config, mainDataset, contribsDataset } = useAppInfo()

const acceptMenuOpen = ref(false)

const prop = defineProps({
  event: {
    type: [Object, null],
    required: true
  }
})

const emit = defineEmits(['accepted'])

async function acceptContribution () {
  const params = {
    method: config.deleteModeratedContribs ? 'DELETE' : 'PATCH'
  }
  if (!config.deleteModeratedContribs) {
    params.body = { status: 'accepted' }
    if (prop.event.operation === 'update') {
      const original = (await ofetch(`${(mainDataset).href}/lines?_id_eq=${prop.event.target_id}`)).results.pop()
      Object.keys(original).filter(k => k.startsWith('_')).forEach(k => delete original[k])
      params.body.original = JSON.stringify(original)
    }
  }
  try {
    await ofetch(`${mainDataset.href}/lines${prop.event.target_id ? '/' + prop.event.target_id : ''}`, {
      method: prop.event.target_id ? 'PUT' : 'POST',
      body: prop.event.payload
    })
    await ofetch(`${contribsDataset.href}/lines/${prop.event.id}`, params)
    acceptMenuOpen.value = false
    emit('accepted')
    timestamp.value = new Date().getTime()
  } catch (e) {
    console.log(e)
    errorMessage.value = e.status + ' - ' + e._data
    displayError.value = true
  }
}
</script>

<template>
  <v-menu
    v-model="acceptMenuOpen"
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
          openDelay: '500'
        }"
        icon="mdi-check"
        color="success"
        v-bind="props"
      />
    </template>
    <v-card
      outlined
      data-iframe-height
    >
      <v-card-title primary-title>
        Accepter la contribution ?
      </v-card-title>
      <v-card-text>
        <v-alert
          :model-value="true"
          type="success"
        >
          Voulez vous vraiment accepter la contribution ?
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          text
          @click="acceptMenuOpen = false"
        >
          Annuler
        </v-btn>
        <v-btn
          color="success"
          @click="acceptContribution()"
        >
          Accepter
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
