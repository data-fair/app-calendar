<script setup>
import { ref } from 'vue'
import useAppInfo from '@/composables/useAppInfo'
import { timestamp } from '@/context'
import { errorMessage, displayError } from '@/messages'
import { ofetch } from 'ofetch'

const { mainDataset } = useAppInfo()

const deleteMenuOpen = ref(false)

const prop = defineProps({
  event: {
    type: [Object, null],
    required: true
  }
})

const emit = defineEmits(['deleted'])

async function deleteEvent () {
  try {
    await ofetch(`${mainDataset.href}/lines${prop.event.id}`, { method: 'DELETE' })
    deleteMenuOpen.value = false
    emit('deleted')
    timestamp.value = new Date().getTime()
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e._data
    displayError.value = true
  }
}
</script>

<template>
  <v-menu
    v-model="deleteMenuOpen"
    :close-on-content-click="false"
    :close-on-click="false"
    min-width="300px"
    max-width="500px"
  >
    <template #activator="{ props }">
      <v-btn
        v-tooltip="{
          text: 'Supprimer l\'événement',
          location: 'right',
          openDelay: '500'
        }"
        icon="mdi-delete"
        color="error"
        v-bind="props"
      />
    </template>
    <v-card
      outlined
      data-iframe-height
    >
      <v-card-title primary-title>
        Supprimer l'événement ?
      </v-card-title>
      <v-card-text>
        <v-alert
          :model-value="true"
          type="error"
        >
          Voulez vous vraiment supprimer l'événement ?
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          text
          @click="deleteMenuOpen = false"
        >
          Annuler
        </v-btn>
        <v-btn
          color="error"
          @click="deleteEvent()"
        >
          Supprimer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
