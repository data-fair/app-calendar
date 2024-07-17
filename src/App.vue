<script setup>
import calendar from '@/components/Calendar.vue'
import useAppInfo from './composables/useAppInfo'
import { displayError, errorMessage } from './context'
import { ofetch } from 'ofetch'
const { datasets, contribution } = useAppInfo()
try {
  if (contribution) {
    if (!datasets.some((d) => d.id === contribution.id)) {
      datasets[1] = contribution
      window.parent.postMessage({ type: 'set-config', content: { field: 'datasets', value: datasets } }, '*')
    }
  } else if (datasets[1]) { datasets.pop(); window.parent.postMessage({ type: 'set-config', content: { field: 'datasets', value: datasets } }, '*') }
} catch (e) {
  ofetch(window.APPLICATION.href + '/error', { body: { message: e.message || e }, method: 'POST' })
}
</script>
<template>
  <calendar />
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
