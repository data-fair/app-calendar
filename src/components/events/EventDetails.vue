<script setup>
import { ref, defineAsyncComponent, watch } from 'vue'
import { computedAsync } from '@vueuse/core'
import useAppInfo from '@/composables/useAppInfo'
import { errorMessage, displayError, timestamp } from '@/context'
import { ofetch } from 'ofetch'
import EventView from './EventView.vue'
import DeleteEvent from './DeleteEvent.vue'

const EventEdit = defineAsyncComponent(() =>
  import('./EventEdit.vue')
)

const { mainDataset, contribsDataset, layout, startDateField, endDateField, dateField } = useAppInfo()
const emit = defineEmits(['updated'])

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
  if (!prop.event.id) mode.value = 'edit'
  if (prop.event.isContrib) {
    const event = prop.event.payload || {}
    if (startDateField && endDateField) {
      event[startDateField] = prop.event.start
      event[endDateField] = prop.event.end
    } else if (dateField) event[dateField] = prop.event.start
    return event
  } else if (!prop.event.id) return { ...prop.event }
  else return (await ofetch(`${(mainDataset).href}/lines?_id_eq=${prop.event.id}`)).results.pop()
}, null, {
  onError: function (e) {
    displayError.value = true
    errorMessage.value = e.message
  }
})

async function editEvent (event) {
  const url = `${prop.event.isContrib ? (contribsDataset.href + `/own/${prop.event._owner}`) : mainDataset.href}/lines${prop.event.id ? ('/' + prop.event.id) : ''}`
  const body = prop.event.isContrib ? { payload: JSON.stringify(event) } : event
  if (prop.event.isContrib) {
    body.operation = prop.event.operation
    body.status = 'submitted'
    body.start = event[startDateField && endDateField ? startDateField : dateField]
    body.end = event[startDateField && endDateField ? endDateField : dateField]
    body._owner = prop.event._owner
    body._ownerName = prop.event._ownerName
    if (prop.event.target_id) body.target_id = prop.event.target_id
  }
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
  <v-card
    max-width="800"
    min-width="200"
  >
    <template v-if="eventData">
      <template v-if="mode === 'read'">
        <v-card-actions
          v-if="layout !== 'simple'"
          class="py-0"
        >
          {{ startDateField && endDateField ? `${new Date(eventData[startDateField]).toLocaleString()} - ${new
            Date(eventData[endDateField]).toLocaleString()}` : new Date(eventData[dateField]).toLocaleDateString() }}
          <v-spacer />
          <v-btn
            v-if="(layout === 'admin' && !event.isContrib) || (layout === 'contrib' && event.operation !== 'delete' && event.status === 'submitted')"
            v-tooltip="{
              text: 'Modifier l\'événement',
              location: 'right',
              openDelay: '500'
            }"
            icon="mdi-pencil"
            color="primary"
            @click="mode = 'edit'"
          />
          <delete-event
            v-if="(layout === 'admin' && !event.isContrib) || (layout === 'contrib' && event.isContrib)"
            :event="event"
            @deleted="emit('updated')"
          />
        </v-card-actions>
        <event-view :item="eventData" />
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
