<script setup>
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import { displayError, errorMessage } from '@/context'
import EditMenu from '@/components/EditMenu.vue'
import { computed } from 'vue'
const { contribUrl, label, startDate, evtDate, endDate, description, thumbnailFields, dataUrl } = useAppInfo()
const props = defineProps({
  selectedContrib: {
    type: Object,
    required: true
  },
  param: {
    type: String,
    required: true
  }
})
const emit = defineEmits(['close-post'])
const action = computed(() => {
  if (props.param === 'post') return 'post-contrib'
  else return 'patch-contrib'
})
async function editContrib (contrib) {
  const formData = new FormData()
  formData.append('operation', props.param === 'post' ? 'create' : 'update')
  formData.append('update', JSON.stringify(contrib.event))
  formData.append('submit_date', new Date().toISOString())
  formData.append('user_name', contrib.user_name)
  formData.append('comment', contrib.comment)
  formData.append('validation_status', 'waiting')
  // todo owner and owner name
  if (props.pram === 'post') {
    try {
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
        allDay: contrib.event[evtDate] ? true : props.selectedContrib.allDay
      }
      newEvent.description = contrib.event[description] || ''
      newEvent.color = '#66bd6d'
      for (const field of thumbnailFields) {
        newEvent[field] = contrib.event[field]
      }
      emit('close-post', newEvent)
    } catch (e) {
      errorMessage.value = e.status + ' - ' + e.data
      displayError.value = true
    }
  } else {
    try {
      const request = await ofetch(dataUrl + '/lines/' + props.selectedContrib.id)
      formData.append('target_id', props.selectedContrib.id)
      formData.append('original', JSON.stringify(request))
      // todo owner
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
        allDay: contrib.event[evtDate] ? true : props.selectedContrib.allDay
      }
      newEvent.description = contrib.event[description] || ''
      newEvent.color = '#f7e17e'
      for (const field of thumbnailFields) {
        newEvent[field] = contrib.event[field]
      }
      emit('close-post', newEvent)
    } catch (e) {
      errorMessage.value = e.status + ' - ' + e.data
      displayError.value = true
    }
  }
}
</script>
<template>
  <edit-menu
    :selected-event="selectedContrib"
    :param="action"
    @action-event="editContrib"
    @close="emit('close-post')"
  />
</template>
