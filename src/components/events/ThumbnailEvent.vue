<script setup>
import useAppInfo from '@/composables/useAppInfo'
import { ref } from 'vue'
const { isRest, layout } = useAppInfo()
defineProps({
  selectedEvent: {
    type: Object,
    required: true
  }
})
const deleteEvt = ref(false)
const emit = defineEmits(['thumb-action'])
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
      class="px-2 py-1 justify-space-between"
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
      <template v-if="layout === 'admin'">
        <v-icon
          v-if="isRest"
          icon="mdi-pencil"
          class="mr-2"
          @click="emit('thumb-action','patch')"
        />
        <v-icon
          v-if="isRest"
          icon="mdi-delete"
          color="red"
          class="mr-2"
          @click="emit('thumb-action','delete', selectedEvent.id)"
        />
      </template>
      <template v-else-if="layout === 'edit'">
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
              Soumettre la demande de suppression ?
            </v-card-title>
            <v-card-text>
              <v-alert
                :model-value="true"
                type="error"
              >
                Voulez vous vraiment soumettre la demande ?
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
                @click="emit('thumb-action','delete-request'), deleteEvt=false"
              >
                Soumettre
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>
      </template>
    </v-card-actions>
  </v-card>
</template>
<style>
.font{
  font-size: 0.95em;
}
.font-key{
  font-size: 1.1em;
  font-weight: 500;
  color :rgb(92, 85, 85)
}
</style>
