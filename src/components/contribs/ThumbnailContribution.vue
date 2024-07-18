<script setup>
import Accept from './Accept.vue'
import Refuse from './Refuse.vue'
import Modify from './Modify.vue'
defineProps({
  selectedContrib: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['action-menu'])
</script>
<template>
  <v-card max-width="1000">
    <v-card-text class="pb-0 font">
      <div>
        <span class="text-h6">Editer la contribution</span>
      </div>
      <v-icon
        class="ma-1 mr-3 mb-2"
        :color="selectedContrib?.backgroundColor"
        icon="mdi-calendar"
      /><span class="text-h6">{{ selectedContrib.title }}</span>
      <div class="my-1">
        <span class="font-key">Debut : </span>{{ selectedContrib.start.toLocaleString() }}
      </div>
      <div
        v-if="selectedContrib.end"
        class="my-1"
      >
        <span class="font-key">Fin : </span>{{ selectedContrib.end.toLocaleString() }}
      </div>
    </v-card-text>
    <v-card-actions
      class="px-2 py-1 justify-space-between"
      :style="{
        minHeight: '30px',
      }"
    >
      <v-btn
        density="default"
        @click="emit('action-menu', 'close')"
      >
        Fermer
      </v-btn>
      <accept />
      <modify />
      <refuse />
    </v-card-actions>
  </v-card>
</template>
<style>
.font {
  font-size: 0.95em;
}
.font-key {
  font-size: 1.1em;
  font-weight: 500;
  color: rgb(92, 85, 85);
}
</style>
