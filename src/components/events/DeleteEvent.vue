<script setup lang="ts">
import { ref } from 'vue'
import { mdiDelete } from '@mdi/js'
import { useConfig } from '@/composables/config'
import { timestamp } from '@/composables/useCalendarData'
import { useAsyncAction } from '@data-fair/lib-vue/async-action'
import { ofetch } from 'ofetch'

const { dataset: mainDataset } = useConfig()

const deleteMenuOpen = ref(false)

const prop = defineProps({
  event: {
    type: [Object, null],
    required: true
  }
})

const emit = defineEmits(['deleted'])

const { execute: deleteEventAction, loading: deleteLoading } = useAsyncAction(
  async () => {
    if (!prop.event) return
    await ofetch(`${mainDataset.value?.href}/lines/${prop.event.originalId}`, { method: 'DELETE' })
    deleteMenuOpen.value = false
    emit('deleted')
    timestamp.value = new Date().getTime()
  },
  { error: 'Erreur lors de la suppression' }
)
</script>

<template>
  <v-menu
    v-model="deleteMenuOpen"
    :close-on-content-click="false"
    persistent
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
        :icon="mdiDelete"
        color="error"
        v-bind="props"
      />
    </template>
    <v-card
      border
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
          Voulez vous vraiment supprimer {{ event?.openingHours ? 'l\'ensemble des créneaux liés à cet ' : 'l\'' }}événement ?
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="deleteMenuOpen = false"
        >
          Annuler
        </v-btn>
        <v-btn
          color="error"
          :loading="deleteLoading"
          @click="deleteEventAction()"
        >
          Supprimer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
