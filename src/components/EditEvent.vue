<script setup>
import { getColor } from '@/assets/util'
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import { useTheme } from 'vuetify'
import { displayError, errorMessage } from '@/context'
import EditMenu from './EditMenu.vue'
import { computed } from 'vue'
const theme = useTheme()
const { dataUrl, color, thumbnailFields, startDate, endDate, evtDate, label, description, category, crowdSourcing } = useAppInfo()
const props = defineProps({
  selectedEvent: {
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
  if (props.param === 'post') return 'Ajouter'
  else return 'Modifier'
})
async function editEvent (event) {
  if (crowdSourcing) {
    //
  } else {
    const formData = new FormData()
    for (const [key, value] of Object.entries(event)) {
      formData.append(key, value)
    }
    try {
      if (props.param === 'post') {
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
        newEvent.description = event[description] || ''
        if (color.type === 'monochrome') {
          newEvent.color = color.colors.type === 'custom' ? color.colors.hexValue : theme.current.value.colors[color.colors.strValue]
        } else {
          const colors = await getColor(reponse[category])
          newEvent.color = colors[reponse[category]]
        }
        for (const field of thumbnailFields) {
          newEvent[field] = reponse[field]
        }
        emit('close-post', newEvent)
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
        emit('close-post')
      }
    } catch (e) {
      errorMessage.value = e.status + ' - ' + e.data
      displayError.value = true
    }
  }
}
</script>
<template>
  <edit-menu
    :selected-event="selectedEvent"
    :param="action"
    @action-event="editEvent"
    @close="emit('close-post')"
  />
</template>
