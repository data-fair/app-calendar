<script setup>
import { ref, defineAsyncComponent, watch } from 'vue'
import { computedAsync } from '@vueuse/core'
import useAppInfo from '@/composables/useAppInfo'
import { errorMessage, displayError, timestamp } from '@/context'
import { ofetch } from 'ofetch'
import EventDisplay from './EventDisplay.vue'

const EventEdit = defineAsyncComponent(() =>
  import('./EventEdit.vue')
)

const { mainDataset, contribsDataset, layout, startDateField, endDateField, dateField } = useAppInfo()
const emit = defineEmits(['updated'])

const deleteMenuOpen = ref(false)
const mode = ref('read')

const prop = defineProps({
  event: {
    type: [Object, null],
    required: true
  }
})

watch(() => prop.event, (event) => {
  mode.value = 'read'
})

const eventData = computedAsync(async () => {
  if (!prop.event) return null
  return (await ofetch(`${(prop.event.isContrib ? contribsDataset : mainDataset).href}/lines?_id_eq=${prop.event.id}`)).results.pop()
}, null, {
  onError: function (e) {
    displayError.value = true
    errorMessage.value = e.message
  }
})

async function deleteEvent () {
  const url = `${mainDataset.href}/lines/${prop.event.id}`
  const params = {
    method: 'DELETE'
  }
  try {
    await ofetch(url, params)
    deleteMenuOpen.value = false
    emit('updated')
    timestamp.value = new Date().getTime()
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e._data
    displayError.value = true
  }
}

async function editEvent (body) {
  const url = `${mainDataset.href}/lines${prop.event.id ? ('/' + prop.event.id) : ''}`
  const params = {
    method: prop.event.id ? 'PUT' : 'POST',
    body
  }
  try {
    await ofetch(url, params)
    emit('updated')
    timestamp.value = new Date().getTime()
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e._data
    displayError.value = true
  }
}

</script>
<template>
  <v-card max-width="800">
    <template v-if="eventData">
      <template v-if="mode === 'read'">
        <v-card-actions
          v-if="layout === 'admin' || (layout === 'contrib' && event.isContrib)"
          class="py-0"
        >
          {{ startDateField && endDateField ? `${new Date(eventData[startDateField]).toLocaleString()} - ${new Date(eventData[endDateField]).toLocaleString()}` : new Date(eventData[dateField]).toLocaleDateString() }}
          <v-spacer />
          <v-btn
            v-tooltip="{
              text: 'Modifier l\'événement',
              location: 'right',
              openDelay: '500'
            }"
            icon="mdi-pencil"
            color="primary"
            @click="mode = 'edit'"
          />
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
                color="red"
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
        </v-card-actions>
        <event-display
          :item="eventData"
        />
      </template>
      <suspense v-if="mode === 'edit'">
        <event-edit
          :item="eventData"
          @validate="editEvent"
          @cancel="mode = 'read'"
        />
        <template #fallback>
          <v-row
            align="center"
            style="height:200px"
            class="ma-0"
          >
            <v-col class="text-center">
              <v-progress-circular
                :size="80"
                :width="7"
                color="primary"
                indeterminate
              />
            </v-col>
          </v-row>
        </template>
      </suspense>
    </template>
    <v-row
      v-else
      align="center"
      style="height:200px"
      class="ma-0"
    >
      <v-col class="text-center">
        <v-progress-circular
          :size="80"
          :width="7"
          color="primary"
          indeterminate
        />
      </v-col>
    </v-row>
  </v-card>
</template>
