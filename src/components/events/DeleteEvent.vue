<script setup>
import { ref } from 'vue'
import useAppInfo from '@/composables/useAppInfo'
import { timestamp } from '@/context'
import { errorMessage, displayError } from '@/messages'
import { ofetch } from 'ofetch'
import { useSession } from '@data-fair/lib/vue/session.js'

const { mainDataset, contribsDataset, layout, labelField } = useAppInfo()

const deleteMenuOpen = ref(false)
const session = useSession()

const prop = defineProps({
  event: {
    type: [Object, null],
    required: true
  }
})

const emit = defineEmits(['deleted'])

async function deleteEvent () {
  const params = {
    method: 'POST'
  }
  let url = `${layout === 'contrib' ? (contribsDataset.href + `/own/user:${session?.state?.user?.id}`) : mainDataset.href}/lines`
  if ((layout === 'contrib' && prop.event.isContrib) || (layout === 'admin' && !prop.event.isContrib)) {
    url += '/' + prop.event.id
    params.method = 'DELETE'
  } else {
    params.body = {
      operation: 'delete',
      status: 'submitted',
      start: new Date(prop.event.start).toISOString(),
      end: new Date(prop.event.end).toISOString(),
      target_id: prop.event.id,
      payload: JSON.stringify({ [labelField]: prop.event.title })
    }
  }

  try {
    await ofetch(url, params)
    deleteMenuOpen.value = false
    emit('deleted')
    timestamp.value = new Date().getTime()
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e._data
    displayError.value = true
  }
}
</script>

<template>
  <v-menu
    v-model="deleteMenuOpen"
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
          openDelay: '500'
        }"
        icon="mdi-delete"
        color="error"
        v-bind="props"
      />
    </template>
    <v-card
      outlined
      data-iframe-height
    >
      <v-card-title primary-title>
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
          @click="deleteMenuOpen = false"
        >
          Annuler
        </v-btn>
        <v-btn
          color="error"
          @click="deleteEvent()"
        >
          Supprimer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
