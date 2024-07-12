<script setup>
import useAppInfo from '@/composables/useAppInfo'
const { isRest } = useAppInfo()
defineProps({
  selectedEvent: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['action-menu'])
</script>
<template>
  <v-card>
    <v-card-text class="pb-0">
      <v-icon
        class="pr-3"
        :style="{
          color: `${selectedEvent?.backgroundColor}`
        }"
        icon="mdi-calendar"
      /><span class="text-subtitle-1 font-weight-medium">{{ selectedEvent.title }}</span>
      <br>
      Debut : {{ selectedEvent.start.toLocaleString() }}
      <br>
      <span v-if="selectedEvent.end">Fin : {{ selectedEvent.end.toLocaleString() }}</span>
      <br>
      Description : <span
        class="d-inline"
        v-html="selectedEvent.extendedProps.description"
      />
    </v-card-text>
    <v-card-actions
      class="px-2 py-1 justify-space-between"
      :style="{
        minHeight : '30px'
      }"
    >
      <v-btn
        density="default"
        @click="emit('action-menu','close')"
      >
        Fermer
      </v-btn>
      <v-icon
        v-if="isRest"
        icon="mdi-pencil"
        class="mr-2"
        @click="emit('action-menu','patch')"
      />
      <v-icon
        v-if="isRest"
        icon="mdi-delete"
        color="red"
        class="mr-2"
        @click="emit('action-menu','delete')"
      />
    </v-card-actions>
  </v-card>
</template>
