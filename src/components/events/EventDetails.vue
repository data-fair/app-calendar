<script setup lang="ts">
import { ref, defineAsyncComponent, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiClose, mdiPencil } from '@mdi/js'
import { useConfig } from '@/composables/config'
import { timestamp } from '@/composables/useCalendarData.js'
import { useUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { useFetch } from '@data-fair/lib-vue/fetch'
import EventView from './EventView.vue'
import DeleteEvent from './DeleteEvent.vue'
import { useDisplay } from 'vuetify'
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'

const { t } = useI18n()
const EventEdit = defineAsyncComponent(() =>
  import('./EventEdit.vue')
)

const { width, height } = useDisplay()
const { config, dataset: mainDataset, layout, startDateField, endDateField, startDateType, endDateType } = useConfig()
const { dayjs } = useLocaleDayjs()
const { sendUiNotif } = useUiNotif()
const emit = defineEmits<{
  updated: []
  close: []
  cancel: []
  'mode-change': [mode: string]
}>()

const mode = ref('read')

const prop = defineProps({
  event: {
    type: [Object, null],
    required: true
  }
})

watch(() => prop.event, (event) => {
  mode.value = (event?.id && !event?.forceEdit) ? 'read' : 'edit'
}, { immediate: true })

watch(mode, (m) => emit('mode-change', m), { immediate: true })

const { data: eventLineData, error: eventLineError } = useFetch(
  computed(() => prop.event?.id && mainDataset.value?.href
    ? `${mainDataset.value.href}/lines`
    : null
  ),
  {
    query: computed(() => prop.event?.id
      ? {
          _id_eq: prop.event.originalId,
          ...(mode.value === 'read' ? { html: 'true' } : {}),
          t: timestamp.value
        }
      : {}
    )
  }
)

const eventData = computed(() => {
  if (!prop.event) return null
  if (!prop.event.id) return { ...prop.event }
  const results = (eventLineData.value as any)?.results
  return results?.[results.length - 1] ?? null
})
watch(eventLineError, (e) => {
  if (e) sendUiNotif({ type: 'error', msg: t('events.loadError'), error: e })
})

function onEditUpdated () {
  timestamp.value = new Date().getTime()
  emit('updated')
}

const missingStart = computed(() =>
  !!(startDateField.value && eventData.value && !eventData.value[startDateField.value])
)
const missingEnd = computed(() =>
  !!(endDateField.value && eventData.value && !eventData.value[endDateField.value])
)

const formatedDate = computed(() => {
  if (!prop.event) return ''
  if (startDateField.value && endDateField.value) {
    const start = dayjs(prop.event.start as string)
    const endRaw = (prop.event.originalEnd ?? prop.event.end) as string | undefined
    if (!endRaw) {
      return start.format('ddd D MMM YYYY') + (startDateType.value === 'date-time' || prop.event.openingHours ? `, ${start.format('HH:mm')}` : '')
    }
    const end = dayjs(endRaw).subtract(startDateType.value === 'date-time' || prop.event.openingHours ? 0 : 1, 'day')
    if (!end.isValid() || end.isBefore(start)) {
      return start.format('ddd D MMM YYYY') + (startDateType.value === 'date-time' || prop.event.openingHours ? `, ${start.format('HH:mm')}` : '')
    }
    if (start.isSame(end, 'day')) {
      const startTimeStr = startDateType.value === 'date-time' || prop.event.openingHours ? start.format('HH:mm') : null
      const endTimeStr = endDateType.value === 'date-time' || prop.event.openingHours ? end.format('HH:mm') : null
      return start.format('ddd D MMM YYYY') +
        (startTimeStr ? `, ${startTimeStr}` : '') +
        (endTimeStr && endTimeStr !== startTimeStr ? ` - ${endTimeStr}` : '')
    } else return start.format('ddd D MMM YYYY' + (startDateType.value === 'date-time' ? ', HH:mm' : '')) + ' - ' + end.format('ddd D MMM YYYY' + (endDateType.value === 'date-time' ? ', HH:mm' : ''))
  } else {
    const start = dayjs(prop.event.start)
    const hasTime = start.format('HH:mm') !== '00:00'
    return start.format('ddd D MMM YYYY') + (hasTime ? ', ' + start.format('HH:mm') : '')
  }
})

function cancel () {
  mode.value = 'read'
  if (!prop.event?.id) emit('updated')
}

function closeOrCancel () {
  // Si on ferme depuis le mode édition, on force un rafraîchissement du calendrier
  if (mode.value === 'edit') {
    timestamp.value = new Date().getTime()
    emit('updated')
  } else if (prop.event?.id) {
    emit('cancel')
  } else {
    emit('close')
  }
}

</script>
<template>
  <v-card
    :max-width="mode === 'read' ? 800 : width*(config.formWidth ?? 5)/10"
    :min-width="mode === 'edit' ? 400 : 300"
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
              text: t('events.edit'),
              location: 'right',
              openDelay: '500'
            }"
            :aria-label="t('events.edit')"
            :icon="mdiPencil"
            color="primary"
            @click="mode = 'edit'"
          />
          <delete-event
            :event="event"
            @deleted="emit('updated')"
          />
          <v-btn
            :icon="mdiClose"
            :aria-label="t('events.close')"
            @click="emit('close')"
          />
        </v-card-actions>
        <v-card-title
          v-else
          class="text-subtitle-1"
        >
          {{ formatedDate }}
        </v-card-title>
        <v-alert
          v-if="missingStart"
          type="warning"
          density="compact"
          variant="tonal"
          class="mx-3 mt-2"
        >
          {{ t('events.missingStart') }}
        </v-alert>
        <v-alert
          v-if="missingEnd"
          type="warning"
          density="compact"
          variant="tonal"
          class="mx-3 mt-2"
        >
          {{ t('events.missingEnd') }}
        </v-alert>
        <event-view
          :item="eventData"
        />
      </template>
      <suspense v-if="mode === 'edit'">
        <div>
          <v-card-actions class="py-0">
            <span class="text-subtitle-1">{{ prop.event?.id ? t('events.editTitle') : t('events.addTitle') }}</span>
            <v-spacer />
            <v-btn
              :icon="mdiClose"
              :aria-label="t('events.close')"
              @click="closeOrCancel"
            />
          </v-card-actions>
          <event-edit
            :item="eventData"
            :pending-event="prop.event"
            @updated="onEditUpdated"
            @cancel="cancel"
          />
        </div>
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
