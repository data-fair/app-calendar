<script setup>
import { ref } from 'vue'
import useAppInfo from '@/composables/useAppInfo'
import { errorMessage, displayError } from '@/context'
import { ofetch } from 'ofetch'
const { layout, mainDataset } = useAppInfo()
const deleteEvt = ref(false)
const prop = defineProps({
  selectedEvent: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['thumb-action'])
async function deleteEvent () {
  const url = `${mainDataset.href}/lines/${prop.selectedEvent.id || 0}`
  const params = {
    method: 'DELETE'
  }
  try {
    await ofetch(url, params)
    prop.selectedEvent.remove()
    deleteEvt.value = false
    emit('thumb-action', 'close')
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e._data
    displayError.value = true
  }
}
</script>
<template>
  <v-card
    max-width="1000"
  >
    <v-card-text
      class="pb-0 font"
    >
      <v-icon
        class="ma-1 mr-3 mb-2"
        :color="selectedEvent?.backgroundColor"
        icon="mdi-calendar"
      /><span class="text-h6">{{ selectedEvent.title }}</span>
      <div class="my-1">
        <span class="font-key">Debut : </span>{{ selectedEvent.start.toLocaleString() }}
      </div>
      <div
        v-if="selectedEvent.end"
        class="my-1"
      >
        <span class="font-key">Fin : </span>{{ selectedEvent.end.toLocaleString() }}
      </div>
      <div
        v-for="(value,key) in selectedEvent.extendedProps"
        :key="key"
        class="my-1"
      >
        <template v-if="key !== 'description'">
          <span class="font-key">{{ key }} :</span> {{ value }}
        </template>
      </div>
      <div v-if="selectedEvent.extendedProps?.description">
        <span class="font-key">Description : </span><span
          v-html="selectedEvent.extendedProps?.description"
        />
      </div>
    </v-card-text>
    <v-card-actions
      class="px-2 py-1"
      :style="{
        minHeight : '30px'
      }"
    >
      <v-btn
        density="default"
        @click="emit('thumb-action','close')"
      >
        Fermer
      </v-btn>
      <v-spacer />
      <template v-if="layout === 'admin'">
        <v-btn
          v-tooltip="{
            text: 'Modifier l\'événement',
            location: 'right',
            openDelay:'500'
          }"
          icon="mdi-pencil"
          color="orange"
          @click="emit('thumb-action','patch')"
        />
        <v-menu
          v-model="deleteEvt"
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
                openDelay:'500'
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
            <v-card-title
              primary-title
            >
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
                @click="deleteEvt = false"
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
    </v-card-actions>
  </v-card>
</template>
