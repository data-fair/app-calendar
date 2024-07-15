<script setup>
import { getParams, getColor } from '@/assets/util'
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import MenuInterface from './MenuInterface.vue'
import { displayError, errorMessage } from '@/context'
const { dataUrl } = useAppInfo()
const { startDate, endDate, label, description, category } = await getParams()
const props = defineProps({
  selectedEvent: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['close-patch'])
// patch an event via the menu
// note : we cant patch current date via this menu, to change date use drag and drop
async function patchParamEvent (obj) {
  const { newEvent, data } = obj
  const event = props.selectedEvent
  const url = `${dataUrl}/lines/${event.id}`
  const tab1 = newEvent.hoursStart.split(':')
  const tab2 = newEvent.hoursEnd.split(':')
  const t1 = event.start
  t1.setHours(tab1[0], tab1[1])
  const formData = new FormData()
  let t2
  // we cant patch the hour of a non-timed event so we necessarily patch startDate field if date has changed
  if (t1.getTime() !== event.start.getTime()) formData.append(startDate, t1.toISOString())
  if (event.end) {
    t2 = event.end
    t2.setHours(tab2[0], tab2[1])
    formData.append(endDate, t2.toISOString())
  }
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value)
  }
  const param = {
    method: 'PATCH',
    body: formData
  }
  try {
    await ofetch(url, param)
    props.selectedEvent.setStart(t1)
    if (event.end) event.setEnd(t2)
    if (data[label]) props.selectedEvent.setProp('title', data[label])
    if (data[description]) props.selectedEvent.setExtendedProp('description', data[description])
    if (data[category]) {
      const colors = await getColor(data[category])
      props.selectedEvent.setProp('color', colors[data[category]])
    }
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e.data
    displayError.value = true
  }
  emit('close-patch')
}
</script>
<template>
  <menu-interface
    :selected-event="selectedEvent"
    param="Modifier"
    @close="emit('close-patch')"
    @action-event="patchParamEvent"
  />
</template>
