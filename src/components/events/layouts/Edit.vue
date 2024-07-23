<script setup>
import { ref } from 'vue'
const emit = defineEmits(['thumb-action'])
const deleteEvt = ref(false)
const modifyEvt = ref(false)
</script>
<template>
  <v-menu
    v-model="modifyEvt"
    :close-on-content-click="false"
    :close-on-click="false"
    min-width="300px"
    max-width="500px"
  >
    <template #activator="{ props }">
      <v-btn
        v-tooltip="{
          text: 'Modifier l\'événement',
          location: 'right',
          openDelay:'500'
        }"
        icon="mdi-pencil"
        color="orange"
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
        Modifier l'événement ?
      </v-card-title>
      <v-card-text>
        <v-alert
          :model-value="true"
          type="warning"
        >
          Voulez vous vraiment soumettre une proposition de modification d'événement ?
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          text
          @click="modifyEvt = false"
        >
          Annuler
        </v-btn>
        <v-btn
          color="orange"
          @click="emit('thumb-action','patch-request'), modifyEvt=false"
        >
          Modifier
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
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
