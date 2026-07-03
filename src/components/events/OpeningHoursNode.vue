<script setup lang="ts">
import { toRef } from 'vue'
import useNode from '@koumoul/vjsf/composables/use-node.js'
import OpeningHoursEditor from '../OpeningHours.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  },
  statefulLayout: {
    type: Object,
    required: true
  }
})

const { inputProps, localData } = useNode(
  toRef(props, 'modelValue') as any,
  props.statefulLayout as any
)
</script>

<template>
  <opening-hours-editor
    v-model="localData"
    v-bind="inputProps"
  />
</template>
