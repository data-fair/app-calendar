<script setup>
import { getColor } from '@/assets/util'
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import { useTheme } from 'vuetify'
import { displayError, errorMessage } from '@/context'
import EditMenu from '@/components/EditMenu.vue'
const theme = useTheme()
const { dataUrl, color, thumbnailFields, startDate, endDate, evtDate, label, description, category } = useAppInfo()
const props = defineProps({
  selectedEvent: {
    type: Object,
    required: true
  },
  operation: {
    type: String,
    required: true
  }
})
const emit = defineEmits(['edit-action'])
const operationType = {
  post: 'post-event',
  patch: 'patch-event',
  'patch-contrib': 'patch-contrib'
}
async function editEvent (event) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(event)) {
    formData.append(key, value)
  }
  try {
    if (props.operation === 'post') {
      const param = {
        method: 'POST',
        body: formData
      }
      const reponse = await ofetch(dataUrl + '/lines', param)
      const newEvent = {
        id: reponse._id,
        title: reponse[label],
        start: reponse[startDate] || reponse[evtDate],
        end: reponse[endDate],
        allDay: reponse[evtDate] ? true : props.selectedEvent.allDay
      }
      newEvent.description = reponse[description] || ''
      if (color.type === 'monochrome') {
        newEvent.color = color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
      } else {
        const colors = await getColor(reponse[category])
        newEvent.color = colors[reponse[category]]
      }
      for (const field of thumbnailFields) {
        newEvent[field] = reponse[field]
      }
      emit('edit-action', newEvent)
    } else {
      const param = {
        method: 'PATCH',
        body: formData
      }
      const reponse = await ofetch(dataUrl + '/lines/' + props.selectedEvent.id, param)
      props.selectedEvent.setStart(reponse[startDate || evtDate])
      if (reponse[endDate]) props.selectedEvent.setEnd(reponse[endDate])
      if (reponse[label]) props.selectedEvent.setProp('title', reponse[label])
      if (reponse[description]) props.selectedEvent.setExtendedProp('description', reponse[description])
      if (reponse[category]) {
        const colors = await getColor(reponse[category])
        props.selectedEvent.setProp('color', colors[reponse[category]])
        props.selectedEvent.setExtendedProp(category, reponse[category])
      }
      for (const field of thumbnailFields) {
        props.selectedEvent.setExtendedProp(field, reponse[field])
      }
      emit('edit-action')
    }
  } catch (e) {
    errorMessage.value = e.status + ' - ' + e.data
    displayError.value = true
  }
}
</script>
<template>
  <edit-menu
    :selected-event="selectedEvent"
    :operation="operationType[props.operation]"
    @submit="editEvent"
    @close="emit('edit-action')"
  />
</template>
