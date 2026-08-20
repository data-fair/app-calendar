<script setup lang="ts">
import { defineAsyncComponent, watch } from 'vue'
import { useConfig } from '@/composables/config'
import { ofetch } from 'ofetch'

const { error } = useConfig()

watch(error, (message) => {
  if (message) ofetch(window.APPLICATION.href + '/error', { body: { message }, method: 'POST' }).catch(() => undefined)
}, { immediate: true })

const Calendar = defineAsyncComponent(() => import('./components/Calendar.vue'))
const SnackBar = defineAsyncComponent(() => import('./components/SnackBar.vue'))
</script>

<template>
  <template v-if="!error">
    <calendar />
    <snack-bar />
  </template>
  <v-empty-state
    v-else
    :title="error"
    headline="Configuration incomplète"
    icon="mdi-calendar"
  />
</template>
