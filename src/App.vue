<script setup>
import calendar from '@/components/Calendar.vue'
import useAppInfo from './composables/useAppInfo'
import { displayError, errorMessage } from './context'
import { ofetch } from 'ofetch'
const { datasets, contribsDataset, layout, crowdSourcing, color } = useAppInfo()

try {
  if (crowdSourcing) {
    if (!datasets.some((d) => d.id === contribsDataset.id)) {
      datasets[1] = contribsDataset
      window.parent.postMessage({ type: 'set-config', content: { field: 'datasets', value: datasets } }, '*')
    } if (color.type === 'multicolor') {
      window.parent.postMessage({
        type: 'set-config',
        content: {
          field: 'color',
          value: {
            type: 'monochrome',
            colors: {
              type: 'theme',
              strValue: 'primary'
            }
          }
        }
      }, '*')
    }
  } else if (datasets[1]) {
    datasets.pop()
    window.parent.postMessage({ type: 'set-config', content: { field: 'datasets', value: datasets } }, '*')
  }
} catch (e) {
  ofetch(window.APPLICATION.href + '/error', { body: { message: e.message || e }, method: 'POST' })
}
</script>
<template>
  <calendar v-if="crowdSourcing && layout==='edit'" />
  <calendar v-else-if="crowdSourcing && layout==='admin'" />
  <calendar v-else />
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
