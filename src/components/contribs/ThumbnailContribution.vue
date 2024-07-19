<script setup>
import Accept from './Accept.vue'
import Refuse from './Refuse.vue'
import Modify from './Modify.vue'
import { computed } from 'vue'
const props = defineProps({
  selectedContrib: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['validate', 'action-menu', 'delete-event'])
const operationType = computed(() => {
  const operation = props.selectedContrib.extendedProps.operation
  return operation === 'create' ? 'Création' : (operation === 'delete' ? 'Suppression' : 'Modification')
})
function validateContrib (newEvent) {
  props.selectedContrib.remove()
  if (newEvent) emit('validate', newEvent)
  else emit('action-menu', 'close')
}
function validDelete (id) {
  console.log('h2')
  props.selectedContrib.remove()
  emit('delete-event', id)
}
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
      <div class="my-1">
        <span class="font-key">Type de demande : </span>{{ operationType }}
      </div>
      <div class="my-1">
        <span class="font-key">Commentaire de contribution : </span>{{ selectedContrib.extendedProps.comment }}
      </div>
      <div class="my-1">
        <span class="font-key">Nom du contributeur : </span>{{ selectedContrib.extendedProps.user_name }}
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
      <accept
        :selected-contrib="selectedContrib"
        @create-contrib="validateContrib"
        @delete-contrib="validDelete"
      />
      <modify />
      <refuse />
    </v-card-actions>
  </v-card>
</template>
