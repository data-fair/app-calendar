<script setup>
import { getColor } from '@/assets/util'
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import { useTheme } from 'vuetify'
import { displayError, errorMessage } from '@/context'
import EditMenu from '@/components/EditMenu.vue'
const theme = useTheme()
const { mainDataset, color, config, startDateField, endDateField, dateField, labelField, descriptionField } = useAppInfo()
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
  patch: 'patch-event'
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
      const reponse = await ofetch(mainDataset.href + '/lines', param)
      const newEvent = {
        id: reponse._id,
        title: reponse[labelField] || '',
        start: reponse[startDateField] || reponse[dateField],
        end: reponse[endDateField],
        allDay: reponse[dateField] ? true : props.selectedEvent.allDay
      }
      newEvent.description = reponse[descriptionField] || ''
      if (color.type === 'monochrome') {
        newEvent.color = color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
      } else {
        const colors = await getColor(reponse[color.field])
        newEvent.color = colors[reponse[color.field]]
      }
      for (const field of config.thumbnailFields) {
        newEvent[field] = reponse[field]
      }
      emit('edit-action', newEvent)
    } else {
      const param = {
        method: 'PATCH',
        body: formData
      }
      const reponse = await ofetch(mainDataset.href + '/lines/' + props.selectedEvent.id, param)
      props.selectedEvent.setStart(reponse[startDateField || dateField])
      if (reponse[endDateField]) props.selectedEvent.setEnd(reponse[endDateField])
      if (reponse[labelField]) props.selectedEvent.setProp('title', reponse[labelField])
      if (reponse[descriptionField]) props.selectedEvent.setExtendedProp('description', reponse[descriptionField])
      if (reponse[color.field]) {
        const colors = await getColor(reponse[color.field])
        props.selectedEvent.setProp('color', colors[reponse[color.field]])
        props.selectedEvent.setExtendedProp(color.field, reponse[color.field])
      }
      for (const field of config.thumbnailFields) {
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
