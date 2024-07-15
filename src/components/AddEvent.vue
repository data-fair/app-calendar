<script setup>
import { getParams, getColor, formatDate } from '@/assets/util'
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import { useTheme } from 'vuetify'
import { displayError, errorMessage } from '@/context'
import MenuInterface from './MenuInterface.vue'
const theme = useTheme()
const { dataUrl, color } = useAppInfo()
const { startDate, endDate, evtDate, label, description, category } = await getParams()
const props = defineProps({
  selectedEvent: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['close-post'])
async function postEvent (obj) {
  const { newEvent, data } = obj
  const tab1 = newEvent.hoursStart.split(':')
  const tab2 = newEvent.hoursEnd.split(':')
  newEvent.date_begin.setHours(tab1[0], tab1[1])
  newEvent.date_end.setHours(tab2[0], tab2[1])
  const formData = new FormData()
  // fill right fields depending on concepts that are used
  // if both concepts are used, timed-format is prioritized
  if (props.selectedEvent.allDay) {
    formData.append(startDate || evtDate, startDate ? newEvent.date_begin.toISOString() : formatDate(newEvent.date_begin))
    if (startDate) formData.append(endDate, newEvent.date_end.toISOString())
  } else {
    if (startDate) {
      formData.append(startDate, newEvent.date_begin.toISOString())
      formData.append(endDate, newEvent.date_end.toISOString())
    } else {
      formData.append(evtDate, formatDate(newEvent.date_begin))
    }
  }
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value)
  }
  const param = {
    method: 'POST',
    body: formData
  }
  try {
    const reponse = await ofetch(dataUrl + '/lines', param)
    const obj = {
      id: reponse._id,
      title: reponse[label],
      start: reponse[evtDate] || reponse[startDate],
      end: reponse[endDate],
      allDay: reponse[evtDate] ? true : props.selectedEvent.allDay
    }
    obj.description = data[description]
    if (color.type === 'monochrome') {
      obj.color = color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
    } else {
      const colors = await getColor(data[category])
      obj.color = colors[data[category]]
    }
    emit('close-post', obj)
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e.data
    displayError.value = true
  }
}
</script>
<template>
  <menu-interface
    :selected-event="selectedEvent"
    param="Ajouter"
    @action-event="postEvent"
    @close="emit('close-post')"
  />
</template>
