<script setup>
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import { displayError, errorMessage } from '@/context'
import EditMenu from '@/components/EditMenu.vue'
const { mainDataset, config, startDateField, endDateField, dateField, labelField, descriptionField } = useAppInfo()
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
