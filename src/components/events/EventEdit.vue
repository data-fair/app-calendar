<script setup lang="ts">
import { computed, watch } from 'vue'
import { useConfig } from '@/composables/config'
import { useWS } from '@data-fair/lib-vue/ws.js'
import { timestamp } from '@/composables/useCalendarData.js'
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'

const { dataset, accessKey, dFrameAdapter, startDateField, endDateField, dateField } = useConfig()
const { dayjs } = useLocaleDayjs()

function toISOAware (value: unknown): string | null {
  if (!value) return null
  const str = String(value)
  // Date-only (YYYY-MM-DD) : pas de conversion UTC pour éviter le décalage de jour
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  return dayjs(str).toISOString()
}
const ws = useWS('/data-fair')

const props = defineProps<{
  item: Record<string, unknown>
  pendingEvent?: Record<string, unknown> | null
}>()
const emit = defineEmits(['validate', 'cancel'])

let handled = false

function handleSaveSuccess () {
  if (handled) return
  handled = true
  timestamp.value = Date.now()
  emit('cancel')
}

watch(() => dataset.value?.id, (id) => {
  if (!id) return
  ws?.subscribe(`datasets/${id}/journal`, (data: { type: string }) => {
    console.log('journal event:', data)
    if (data.type === 'finalize-end') handleSaveSuccess()
  })
}, { immediate: true })

function onDFrameNotif (e: Event) {
  const detail = (e as CustomEvent).detail
  if (detail?.type === 'error' || detail?.type === 'warning') return
  // Fallback : si le WebSocket ne répond pas dans 1.5s, on déclenche le rafraîchissement
  setTimeout(handleSaveSuccess, 1500)
}

const src = computed(() => {
  if (!dataset.value?.id) return null
  const id = `${accessKey ? accessKey + '%3A' : ''}${dataset.value.id}`
  const lineId = props.item._id as string | undefined

  // Valeurs de date à pré-remplir dans le formulaire.
  // pendingEvent contient les nouvelles dates pour drag/resize, item contient les données API (anciennes dates).
  // TODO: les passer en paramètres d'URL de l'iframe une fois que data-fair les supportera.
  const source = props.pendingEvent ?? props.item
  const defaultStart = toISOAware(
    (startDateField.value && source[startDateField.value]) ?? (dateField.value && source[dateField.value])
  )
  const defaultEnd = toISOAware(endDateField.value && source[endDateField.value])
  console.log('[EventEdit] default dates:', { defaultStart, defaultEnd })

  if (lineId) return `/data-fair/embed/dataset/${id}/form?_id_eq=${lineId}`
  return `/data-fair/embed/dataset/${id}/form`
})
</script>
<template>
  <div style="max-height: 600px; overflow-y: auto; display: block; position: relative;">
    <d-frame
      v-if="src"
      :adapter="dFrameAdapter"
      :src="src"
      style="width: 100%; display: block;"
      @notif="onDFrameNotif"
    />
  </div>
</template>
