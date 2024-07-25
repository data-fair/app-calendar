<script setup>
import Accept from './Accept.vue'
import Refuse from './Refuse.vue'
import DetailsContrib from './Details.vue'
import useAppInfo from '@/composables/useAppInfo'
import { ofetch } from 'ofetch'
import { errorMessage, displayError } from '@/context'
import { ref } from 'vue'
const { layout, contribUrl } = useAppInfo()
const deleteC = ref(false)
const prop = defineProps({
  selectedContrib: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['thumb-action'])
async function deleteContrib () {
  try {
    await ofetch(`${contribUrl}/lines/${prop.selectedContrib.id || 0}`, { method: 'DELETE' })
    if (prop.selectedContrib.extendedProps.target_id) emit('thumb-action', 'restore-event', prop.selectedContrib.extendedProps.target_id)
    else emit('thumb-action', 'close')
    prop.selectedContrib.remove()
    deleteC.value = false
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e.data
    displayError.value = true
  }
}
</script>
<template>
  <v-card max-width="1000">
    <v-card-text class="pb-0 font">
      <div>
        <span class="text-h6">Aperçu de la contribution</span>
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
        <span class="font-key">Type de demande : Création</span>
      </div>
      <div class="my-1">
        <span class="font-key">Commentaire de contribution : </span>{{ selectedContrib.extendedProps?.comment }}
      </div>
      <div class="my-1">
        <span class="font-key">Nom du contributeur : </span>{{ selectedContrib.extendedProps?.user_name }}
      </div>
      <details-contrib
        :selected-contrib="selectedContrib"
      />
    </v-card-text>
    <v-card-actions
      class="px-2 py-1"
      :style="{
        minHeight: '30px',
      }"
    >
      <v-btn
        density="default"
        @click="emit('thumb-action', 'close')"
      >
        Fermer
      </v-btn>
      <v-spacer />
      <v-btn
        v-tooltip="{
          text: 'Modifier la contribution',
          location: 'right',
          openDelay:'500'
        }"
        icon="mdi-calendar-edit"
        color="orange"
        @click="emit('thumb-action','patch-contrib')"
      />
      <template v-if="layout==='admin'">
        <accept
          :selected-contrib="selectedContrib"
          @accept="(newEvent)=>emit('thumb-action','create',newEvent)"
        />
        <refuse
          :selected-contrib="selectedContrib"
        />
      </template>
      <v-menu
        v-else
        v-model="deleteC"
        :close-on-content-click="false"
        :close-on-click="false"
        min-width="300px"
        max-width="500px"
      >
        <template #activator="{ props }">
          <v-btn
            v-tooltip="{
              text: 'Supprimer la contribution',
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
            Supprimer la contribution ?
          </v-card-title>
          <v-card-text>
            <v-alert
              :model-value="true"
              type="error"
            >
              Voulez vous vraiment supprimer la contribution ?
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              text
              @click="deleteC = false"
            >
              Annuler
            </v-btn>
            <v-btn
              color="error"
              @click="deleteContrib"
            >
              Supprimer
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-menu>
    </v-card-actions>
  </v-card>
</template>
