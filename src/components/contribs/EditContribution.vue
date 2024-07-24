<script setup>
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import { displayError, errorMessage } from '@/context'
import EditMenu from '@/components/EditMenu.vue'
const { contribUrl, label, startDate, evtDate, endDate, description, dataUrl, user } = useAppInfo()
const props = defineProps({
  selectedContrib: {
    type: Object,
    required: true
  },
  operation: { // patch, post, delete
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
  formData.append('submit_date', new Date().toISOString())
  formData.append('user_name', contrib.user_name)
  formData.append('comment', contrib.comment)
  formData.append('validation_status', 'waiting')
  formData.append('_owner', user.id)
  try {
    if (props.operation === 'post') {
      formData.append('operation', 'create')
      formData.append('update', JSON.stringify(contrib.event))
      const param = {
        method: 'POST',
        body: formData
      }
      const reponse = await ofetch(contribUrl + '/lines', param)
      const newEvent = {
        id: reponse._id,
        title: contrib.event[label],
        start: contrib.event[startDate] || contrib.event[evtDate],
        end: contrib.event[endDate],
        allDay: props.selectedContrib.allDay,
        color: '#66bd6d',
        contrib: true,
        operation: 'create',
        comment: contrib.comment,
        user_name: contrib.user_name,
        description: contrib.event[description] || ''
      }
      emit('edit-action', newEvent)
    } else if (props.operation === 'patch-request') {
      const event = await ofetch(dataUrl + '/lines/' + props.selectedContrib.id)
      formData.append('operation', 'update')
      formData.append('target_id', props.selectedContrib.id)
      formData.append('update', JSON.stringify(contrib.event))
      formData.append('original', JSON.stringify(event))
      const param = {
        method: 'POST',
        body: formData
      }
      const reponse = await ofetch(contribUrl + '/lines', param)
      const newEvent = {
        id: reponse._id,
        title: event[label],
        start: event[startDate] || event[evtDate],
        end: event[endDate],
        allDay: props.selectedContrib.allDay,
        color: '#ffad33',
        contrib: true,
        editable: false,
        comment: contrib.comment,
        user_name: contrib.user_name,
        operation: 'update',
        target_id: reponse.target_id,
        description: event[description] || ''
      }
      props.selectedContrib.setProp('display', 'none')
      emit('edit-action', newEvent)
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
