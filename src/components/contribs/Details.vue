<script setup>
import { reactive, ref } from 'vue'
import { errorMessage, displayError } from '@/context'
import useAppInfo from '@/composables/useAppInfo'
import { ofetch } from 'ofetch'
const { contribUrl, startDate, endDate, evtDate } = useAppInfo()
const prop = defineProps({
  selectedContrib: {
    type: Object,
    required: true
  }
})
const diffMenu = ref(false)
const diff = reactive({
  oldEvent: {},
  newEvent: {}
})
async function showDiff () {
  try {
    const request = await ofetch(contribUrl + '/lines/' + prop.selectedContrib.id)
    const newEvent = JSON.parse(request.update)
    for (const [key, value] of Object.entries(newEvent)) {
      if ([startDate, endDate, evtDate].includes(key)) diff.newEvent[key] = new Date(value).toLocaleString()
      else diff.newEvent[key] = value
    }
    diff.newEvent.operation = 'create'
    diff.newEvent.commentaire = prop.selectedContrib.extendedProps.comment
    diff.newEvent.nom_utilisateur = prop.selectedContrib.extendedProps.user_name
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e.data
    displayError.value = true
  }
}
</script>
<template>
  <v-menu
    v-model="diffMenu"
    :close-on-content-click="false"
    :close-on-click="false"
    min-width="300px"
    max-width="600px"
  >
    <template #activator="{ props }">
      <v-btn
        v-tooltip="{
          text: 'Voir toute la contribution',
          location: 'right',
          openDelay:'500'
        }"
        class="mt-2"
        rounded
        v-bind="props"
        @click="showDiff"
      >
        <v-icon>
          mdi-calendar-search
        </v-icon>
      </v-btn>
    </template>
    <v-card
      outlined
      data-iframe-height
    >
      <v-card-title
        primary-title
      >
        Détails de la contribution :
      </v-card-title>
      <v-card-text>
        <v-list two-line>
          <v-list-item
            v-for="(value, key) in diff.newEvent"
            :key="key"
            class="text-body-2"
          >
            <v-list-item-title class="text-subtitle-1">
              {{ key }}
            </v-list-item-title>
            {{ value }}
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          text
          @click="diffMenu = false"
        >
          Fermer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
