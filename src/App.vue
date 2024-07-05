<script setup>
import calendar from '@/components/calendar.vue'
import useAppInfo from './composables/useAppInfo'
const { screenSize } = useAppInfo()
</script>
<template>
  <div
    :style="{
      height:`${screenSize}`+'px',
      overflowY:'auto'
    }"
  >
    <calendar />
  </div>
</template>
