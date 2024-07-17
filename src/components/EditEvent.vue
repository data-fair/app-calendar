<script setup>
import { getColor } from '@/assets/util'
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import { useTheme } from 'vuetify'
import { displayError, errorMessage } from '@/context'
import EditMenu from './EditMenu.vue'
import { computed } from 'vue'
const theme = useTheme()
const { dataUrl, color, thumbnailFields, startDate, endDate, evtDate, label, description, category } = useAppInfo()
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
  const formData = new FormData()
  for (const [key, value] of Object.entries(event)) {
    formData.append(key, value)
  }
  if (props.param === 'patch') {
    formData.append('_id', props.selectedEvent.id)
    formData.append('_action', 'update')
  }
  const param = {
    method: 'POST',
    body: formData
  }
  try {
    const reponse = await ofetch(dataUrl + '/lines', param)
    if (props.param === 'post') {
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
      for (const [, v] of Object.entries(thumbnailFields)) {
        newEvent[v.thumb.key] = reponse[v.thumb.key]
      }
      emit('close-post', newEvent)
    } else {
      props.selectedEvent.setStart(reponse[startDate || evtDate])
      if (reponse[endDate]) props.selectedEvent.setEnd(reponse[endDate])
      if (reponse[label]) props.selectedEvent.setProp('title', reponse[label])
      if (reponse[description]) props.selectedEvent.setExtendedProp('description', reponse[description])
      if (reponse[category]) {
        const colors = await getColor(reponse[category])
        props.selectedEvent.setProp('color', colors[reponse[category]])
        props.selectedEvent.setExtendedProp(category, reponse[category])
      }
      for (const [, v] of Object.entries(thumbnailFields)) {
        props.selectedEvent.setExtendedProp(v.thumb.key, reponse[v.thumb.key])
      }
      emit('close-post')
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
    :param="action"
    @action-event="editEvent"
    @close="emit('close-post')"
  />
</template>
