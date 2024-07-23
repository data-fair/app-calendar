<script setup>
import Accept from './Accept.vue'
import Refuse from './Refuse.vue'
import DetailsDiff from './Details.vue'
import useAppInfo from '@/composables/useAppInfo'
import { ofetch } from 'ofetch'
import { errorMessage, displayError } from '@/context'
const { layout, contribUrl } = useAppInfo()
const props = defineProps({
  selectedContrib: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['thumb-action'])
const operationType = {
  create: 'Création',
  delete: 'Suppression',
  update: 'Modification'
}
// content is a new Event (Object) or the id (String) of the event to delete
function validateContrib (operation, content) {
  if (operation === 'create') {
    props.selectedContrib.remove()
    emit('thumb-action', 'validate-contrib', content)
  } else if (operation === 'delete') emit('thumb-action', 'delete', content)
  else emit('thumb-action', 'close')
}
async function deleteContrib () {
  const param = {
    method: 'DELETE'
  }
  try {
    await ofetch(`${contribUrl}/lines/${props.selectedContrib.id || 0}`, param)
    if (props.selectedContrib.extendedProps.target_id) emit('thumb-action', 'restore-event', props.selectedContrib.extendedProps.target_id)
    else emit('thumb-action', 'close')
    props.selectedContrib.remove()
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e.data
    displayError.value = true
  }
}
function refuseContrib (id) {
  props.selectedContrib.remove()
  emit('thumb-action', 'restore-event', id)
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
        <span class="font-key">Type de demande : </span>{{ operationType[props.selectedContrib.extendedProps.operation] }}
      </div>
      <div class="my-1">
        <span class="font-key">Commentaire de contribution : </span>{{ selectedContrib.extendedProps.comment }}
      </div>
      <div class="my-1">
        <span class="font-key">Nom du contributeur : </span>{{ selectedContrib.extendedProps.user_name }}
      </div>
      <details-diff
        v-if="selectedContrib.extendedProps.operation !== 'delete'"
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
      <template v-if="layout==='admin'">
        <accept
          :selected-contrib="selectedContrib"
          @accept="validateContrib"
        />
        <refuse
          :selected-contrib="selectedContrib"
          @refuse="refuseContrib"
        />
      </template>
      <v-icon
        v-else
        icon="mdi-delete"
        color="red"
        class="mr-2"
        @click="deleteContrib"
      />
    </v-card-actions>
  </v-card>
</template>
