<script setup>
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import { displayError, errorMessage } from '@/context'
import EditMenu from '@/components/EditMenu.vue'
import { getColor } from '@/assets/util'
const { contribUrl, label, startDate, evtDate, endDate, description, user, colorContrib, category } = useAppInfo()
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
  formData.append('_owner', user.id)
  formData.append('operation', 'create')
  formData.append('update', JSON.stringify(contrib.event))
  try {
    if (props.operation === 'post') {
      formData.append('submit_date', new Date().toISOString())
      const param = {
        method: 'POST',
        body: formData
      }
      const reponse = await ofetch(contribUrl + '/lines', param)
      const newEvent = {
        id: reponse._id,
        title: contrib.event[label] || '',
        start: contrib.event[startDate] || contrib.event[evtDate],
        end: contrib.event[endDate],
        allDay: props.selectedContrib.allDay,
        contrib: true,
        operation: 'create',
        comment: contrib.comment,
        user_name: contrib.user_name,
        description: contrib.event[description] || '',
        className: 'contribution'
      }
      if (colorContrib.noContribColor) {
        newEvent.color = colorContrib.hexValue
      } else {
        const colors = await getColor(contrib.event[category])
        newEvent[category] = contrib.event[category]
        newEvent.color = colors[contrib.event[category]]
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
      await ofetch(contribUrl + '/_bulk_lines', param)
      // todo notify contrib's owner of the modif if user is 'admin'
      props.selectedContrib.setStart(contrib.event[startDate] || contrib.event[evtDate])
      props.selectedContrib.setEnd(contrib.event[endDate])
      props.selectedContrib.setProp('title', contrib.event[label] || '')
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
