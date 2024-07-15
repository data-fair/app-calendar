<script setup>
import Vjsf from '@koumoul/vjsf'
import { ref, reactive } from 'vue'
import { getParams, formatHours } from '@/assets/util'
import { VDateInput } from 'vuetify/labs/VDateInput'
const { startDate, additionalParams } = await getParams()
const props = defineProps({
  selectedEvent: {
    type: Object,
    required: true
  },
  param: {
    type: String,
    required: true
  }
})
const emit = defineEmits(['action-event', 'close'])
const newEvent = reactive({
  hoursStart: formatHours(props.selectedEvent.start),
  hoursEnd: props.selectedEvent.end ? formatHours(props.selectedEvent.end) : formatHours(new Date()),
  date_begin: props.selectedEvent.start,
  date_end: props.selectedEvent.end
})
const options = {
  density: 'compact',
  locale: 'fr'
}
const data = ref(null)
</script>
<template>
  <v-card
    class="pa-3 menu"
  >
    <div class="text-h6 text-center pb-2">
      {{ param }} un événement
    </div>
    <div
      v-if="props.selectedEvent.menu"
      class="d-flex"
      :style="{
        position: 'relative',
      }"
    >
      <v-date-input
        label="Date de début"
        width="100%"
        density="comfortable"
      />
      <v-text-field
        v-if="startDate"
        v-model="newEvent.hoursStart"
        :style="{
          position: 'absolute',
          right: '0'
        }"
        label="Horaire de début"
        type="time"
        density="comfortable"
        width="45%"
      />
    </div>
    <v-text-field
      v-else-if="startDate"
      v-model="newEvent.hoursStart"
      label="Horaire de début"
      density="comfortable"
      type="time"
      :prefix="newEvent.date_begin?.toLocaleDateString()"
    />
    <div
      v-if="props.selectedEvent.menu && props.selectedEvent.end"
      class="d-flex"
      :style="{
        position: 'relative',
      }"
    >
      <v-date-input
        label="Date de fin"
        width="100%"
        density="comfortable"
      />
      <v-text-field
        v-model="newEvent.hoursEnd"
        :style="{
          position: 'absolute',
          right: '0'
        }"
        label="Horaire de début"
        type="time"
        density="comfortable"
        width="45%"
      />
    </div>
    <v-text-field
      v-if="!props.selectedEvent.allDay && !props.selectedEvent.menu && startDate"
      v-model="newEvent.hoursEnd"
      label="Horaire de fin"
      density="comfortable"
      type="time"
      :prefix="newEvent.date_end?.toLocaleDateString()"
    />
    <vjsf
      v-model="data"
      :schema="additionalParams"
      :options="options"
    />
    <div class="d-flex justify-space-between mt-3">
      <v-btn
        class="ml-3"
        @click="emit('action-event', {newEvent: newEvent, data: data})"
      >
        {{ param }}
      </v-btn>
      <v-btn
        class="mr-3"
        @click="emit('close')"
      >
        Annuler
      </v-btn>
    </div>
  </v-card>
</template>
