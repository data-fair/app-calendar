<script setup>
import { ref, defineAsyncComponent, watch, computed } from 'vue'
import { computedAsync } from '@vueuse/core'
import useAppInfo from '@/composables/useAppInfo'
import { timestamp } from '@/context'
import { errorMessage, displayError } from '@/messages'
import { ofetch } from 'ofetch'
import EventView from './EventView.vue'
import DeleteEvent from './DeleteEvent.vue'
import { useDisplay } from 'vuetify'
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'

const EventEdit = defineAsyncComponent(() =>
  import('./EventEdit.vue')
)

const { width, height } = useDisplay()
const { config, mainDataset, layout, startDateField, endDateField, startDateType, endDateType } = useAppInfo()
const { dayjs } = useLocaleDayjs()
const emit = defineEmits(['updated', 'close'])

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
  if (!prop.event.id) return { ...prop.event }
  else return (await ofetch(`${(mainDataset).href}/lines?_id_eq=${prop.event.originalId}${mode.value === 'read' ? '&html=true' : ''}`)).results.pop()
}, null, {
  onError: function (e) {
    displayError.value = true
    errorMessage.value = e.message
  }
})

async function editEvent (eventData) {
  const formData = new FormData()
  const { __file, ...event } = eventData
  const body = layout === 'contrib' ? { payload: JSON.stringify(event) } : event
  for (const [key, value] of Object.entries(body)) formData.append(key, value)
  if (__file) formData.append('attachment', __file)
  const params = {
    method: 'POST',
    body: formData,
    headers: { 'Content-Disposition': formData }
  }
  let url = `${mainDataset.href}/lines`
  if (prop.event.originalId) {
    url += '/' + prop.event.originalId
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

const formatedDate = computed(() => {
  if (startDateField && endDateField) {
    const start = dayjs(prop.event.start)
    const end = dayjs(prop.event.end).subtract(startDateType === 'date-time' || prop.event.openingHours ? 0 : 1, 'day')
    if (start.isSame(end, 'day')) return start.format('ddd D MMM YYYY') + (startDateType === 'date-time' || prop.event.openingHours ? (', ' + start.format('HH:mm')) : '') + (endDateType === 'date-time' || prop.event.openingHours ? (' - ' + end.format('HH:mm')) : '')
    else return start.format('ddd D MMM YYYY' + (startDateType === 'date-time' ? ', HH:mm' : '')) + ' - ' + end.format('ddd D MMM YYYY' + (endDateType === 'date-time' ? ', HH:mm' : ''))
  } else return dayjs(prop.event.start).format('dd, MMM YYYY')
})

function cancel () {
  mode.value = 'read'
  if (!prop.event.id) emit('updated')
}

</script>
<template>
  <v-card
    :max-width="mode === 'read' ? 800 : width*config.formWidth/10"
    :min-width="300"
    :max-height="height*0.8"
  >
    <template v-if="eventData">
      <template v-if="mode === 'read'">
        <v-card-actions
          v-if="layout === 'admin'"
          class=" py-0"
        >
          {{ formatedDate }}
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
          <delete-event
            :event="event"
            @deleted="emit('updated')"
          />
          <v-btn
            icon="mdi-close"
            @click="emit('close')"
          />
        </v-card-actions>
        <v-card-title
          v-else
          class="text-subtitle-1"
        >
          {{ formatedDate }}
        </v-card-title>
        <event-view
          :item="eventData"
        />
      </template>
      <suspense v-if="mode === 'edit'">
        <event-edit
          :item="eventData"
          @validate="editEvent"
          @cancel="cancel"
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
