<script setup>
import { ref } from 'vue'
import { computedAsync } from '@vueuse/core'
import useAppInfo from '@/composables/useAppInfo'
import { errorMessage, displayError, timestamp } from '@/context'
import { ofetch } from 'ofetch'
import EventDisplay from './EventDisplay.vue'
// import EventEdit from './EventEdit.vue'

const { mainDataset, contribsDataset, layout } = useAppInfo()
const emit = defineEmits(['deleted'])

const deleteMenuOpen = ref(false)
const mode = ref('read')

const prop = defineProps({
  event: {
    type: Object,
    required: true
  }
})

const eventData = computedAsync(async () => {
  return (await ofetch(`${(prop.event.isContrib ? contribsDataset : mainDataset).href}/lines?_id_eq=${prop.event.id}`)).results.pop()
}, null, {
  onError: function (e) {
    displayError.value = true
    errorMessage.value = e.message
  }
})

async function deleteEvent () {
  const url = `${mainDataset.href}/lines/${prop.event.id}`
  const params = {
    method: 'DELETE'
  }
  try {
    await ofetch(url, params)
    prop.event.remove()
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
  <v-card max-width="800">
    <v-card-actions
      v-if="layout === 'admin' || (layout === 'contrib' && event.isContrib)"
      class="py-0"
      style="margin-bottom:-32px;"
    >
      <v-spacer />
      <v-btn
        v-tooltip="{
          text: 'Modifier l\'événement',
          location: 'right',
          openDelay: '500'
        }"
        icon="mdi-pencil"
        color="primary"
        @click="mode.value = edit"
      />
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
            color="red"
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
    </v-card-actions>
    <template v-if="eventData">
      <event-display
        v-if="mode === 'read'"
        :item="eventData"
      />
      <!-- <event-edit
        v-if="mode === 'edit'"
        :item="eventData"
      /> -->
    </template>
  </v-card>
</template>
