<script setup>
import { ref, defineAsyncComponent, watch } from 'vue'
import { computedAsync } from '@vueuse/core'
import useAppInfo from '@/composables/useAppInfo'
import { errorMessage, displayError, timestamp } from '@/context'
import { ofetch } from 'ofetch'
import EventView from './EventView.vue'
import DeleteEvent from './DeleteEvent.vue'
import AcceptContribution from '../contribs/AcceptContribution.vue'
import RefuseContribution from '../contribs/RefuseContribution.vue'
import ContributionStatus from '../contribs/ContributionStatus.vue'
import DiffView from '../contribs/DiffView.vue'
import { useSession } from '@data-fair/lib/vue/session.js'

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

const session = useSession()

watch(() => prop.event, (event) => {
  mode.value = 'read'
})

const operationLabel = {
  create: 'd\'ajout',
  update: 'de modification',
  delete: 'de suppression'
}

const eventData = computedAsync(async () => {
  if (!prop.event) return null
  if (!prop.event.id) mode.value = 'edit'
  if (prop.event.isContrib) {
    const event = { ...(prop.event.payload || {}) }
    if (startDateField && endDateField) {
      if (!event[startDateField]) event[startDateField] = prop.event.start
      if (!event[endDateField]) event[endDateField] = prop.event.end
    } else if (dateField && !event[dateField]) event[dateField] = prop.event.start
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
  const body = layout === 'contrib' ? { payload: JSON.stringify(event) } : event
  if (layout === 'contrib') {
    body.operation = prop.event.isContrib ? prop.event.operation : 'update'
    body.status = 'submitted'
    body.start = event[startDateField && endDateField ? startDateField : dateField]
    body.end = event[startDateField && endDateField ? endDateField : dateField]
    body._owner = session?.state?.user?.id
    body._ownerName = session?.state?.user?.name
    if (prop.event.target_id) body.target_id = prop.event.target_id
    else if (layout === 'contrib' && !prop.event.isContrib) body.target_id = prop.event.id
  }
  const params = {
    method: 'POST',
    body
  }
  let url = `${layout === 'contrib' ? (contribsDataset.href + `/own/user:${session?.state?.user?.id}`) : mainDataset.href}/lines`
  if (((layout === 'contrib' && prop.event.isContrib) || (layout === 'admin' && !prop.event.isContrib)) && prop.event.id) {
    url += '/' + prop.event.id
    params.method = 'PUT'
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
        <div v-if=" event.isContrib">
          Proposition {{ operationLabel[event.operation] }}
          <span v-if="(layout === 'admin')">
            par {{ event._ownerName }}
          </span>
        </div>
        <v-card-actions
          v-if=" layout !=='simple'"
          class=" py-0"
        >
          {{ startDateField && endDateField ? `${new Date(eventData[startDateField]).toLocaleString()} - ${new
            Date(eventData[endDateField]).toLocaleString()}` : new Date(eventData[dateField]).toLocaleDateString() }}
          <v-spacer />
          <v-btn
            v-if="!event.isContrib || (layout === 'contrib' && event.operation !== 'delete' && event.status === 'submitted')"
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
            v-if="(layout === 'contrib' && event.status === 'submitted') || !event.isContrib"
            :event="event"
            @deleted="emit('updated')"
          />
          <refuse-contribution
            v-if="layout === 'admin' && event.isContrib && event.status === 'submitted' "
            :event="event"
            @refused="emit('updated')"
          />
          <accept-contribution
            v-if="layout === 'admin' && event.isContrib && event.status === 'submitted'"
            :event="event"
            @accepted="emit('updated')"
          />
          <contribution-status
            v-if="event.isContrib && (layout === 'contrib' || event.status !== 'submitted')"
            :value="event.status"
          />
        </v-card-actions>
        <diff-view
          v-if="event.isContrib && event.operation === 'update'"
          :item="eventData"
          :old="event.original || {id:event.target_id}"
        />
        <event-view
          v-else
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
