<script setup>
import { ref } from 'vue'
const deleteEvt = ref(false)
const emit = defineEmits(['thumb-action'])
</script>
<template>
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
          @click="emit('thumb-action','delete'), deleteEvt=false"
        >
          Supprimer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
