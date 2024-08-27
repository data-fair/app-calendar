<script setup>
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import { displayError, errorMessage } from '@/context'
import EditMenu from '@/components/EditMenu.vue'
import { getColor } from '@/assets/util'
const { application, config, contribsDataset, labelField, startDateField, endDateField, dateField, descriptionField, color } = useAppInfo()
const props = defineProps({
  selectedContrib: {
    type: Object,
    required: true
  },
  operation: {
    type: String,
    required: true
  }
})
const emit = defineEmits(['edit-action'])
const operationType = { // specify we handle a contribution
  post: 'post-contrib',
  'patch-contrib': 'patch-contrib'
}
async function editContrib (contrib) {
  const formData = new FormData()
  formData.append('user_name', contrib.user_name)
  formData.append('comment', contrib.comment)
  formData.append('validation_status', 'waiting')
  formData.append('_owner', application.owner.id)
  formData.append('operation', 'create')
  formData.append('update', JSON.stringify(contrib.event))
  try {
    if (props.operation === 'post') {
      formData.append('submit_date', new Date().toISOString())
      const param = {
        method: 'POST',
        body: formData
      }
      const reponse = await ofetch(contribsDataset?.href + '/lines', param)
      const newEvent = {
        id: reponse._id,
        title: contrib.event[labelField] || '',
        start: contrib.event[startDateField] || contrib.event[dateField],
        end: contrib.event[endDateField],
        allDay: props.selectedContrib.allDay,
        contrib: true,
        operation: 'create',
        comment: contrib.comment,
        user_name: contrib.user_name,
        description: contrib.event[descriptionField] || '',
        className: 'contribution'
      }
      if (config.colorContrib.noContribColor) {
        newEvent.color = config.colorContrib.hexValue
      } else {
        const colors = await getColor(contrib.event[color.field])
        newEvent[color.field] = contrib.event[color.field]
        newEvent.color = colors[contrib.event[color.field]]
      }
      emit('edit-action', newEvent)
    } else if (props.operation === 'patch-contrib') {
      formData.append('_id', props.selectedContrib.id)
      formData.append('_action', 'update')
      const param = {
        method: 'POST',
        body: JSON.stringify([Object.fromEntries(formData)]),
        headers: {
          'Content-type': 'application/json'
        }
      }
      await ofetch(contribsDataset?.href + '/_bulk_lines', param)
      // todo notify contrib's owner of the modif if user is 'admin'
      props.selectedContrib.setStart(contrib.event[startDateField] || contrib.event[dateField])
      props.selectedContrib.setEnd(contrib.event[endDateField])
      props.selectedContrib.setProp('title', contrib.event[labelField] || '')
      props.selectedContrib.setExtendedProp('comment', contrib.comment)
      props.selectedContrib.setExtendedProp('user_name', contrib.user_name)
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
    :selected-event="selectedContrib"
    :operation="operationType[operation]"
    @submit="editContrib"
    @close="emit('edit-action')"
  />
</template>
