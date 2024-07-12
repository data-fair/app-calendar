<script setup>
import calendar from '@/components/Calendar.vue'
import useAppInfo from './composables/useAppInfo'
import { displayError, errorMessage } from './context'
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
  <v-snackbar
    v-model="displayError"
    :timeout="'5000'"
    color="red"
  >
    <div>
      {{ errorMessage }}
    </div>
  </v-snackbar>
</template>
