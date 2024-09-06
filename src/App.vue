<script setup>
import { defineAsyncComponent } from 'vue'
import useAppInfo from './composables/useAppInfo'
import { ofetch } from 'ofetch'

const configuration = window.APPLICATION.configuration

let configureError
try {
  const { config, mainDataset } = useAppInfo()
  if (config.crowdSourcing) {
    const datasets = [mainDataset]
    if (config.contribsDataset) datasets.push(config.contribsDataset)
    if ((config.datasets || []).map(d => d.id).join('-') !== datasets.map(d => d.id).join('-')) window.parent.postMessage({ type: 'set-config', content: { field: 'datasets', value: datasets } }, '*')
  }
} catch (e) {
  console.log(e)
  configureError = e.message
  ofetch(window.APPLICATION.href + '/error', { body: { message: e.message || e }, method: 'POST' })
}

const Calendar = defineAsyncComponent(() =>
  import('./components/Calendar.vue')
)
const SnackBar = defineAsyncComponent(() =>
  import('./components/SnackBar.vue')
)
const ContribsDataset = defineAsyncComponent(() =>
  import('./components/ContribsDataset.vue')
)
</script>
<template>
  <template v-if="!configureError">
    <calendar />
    <snack-bar />
  </template>
  <template v-else>
    <v-img
      src="/undraw_building_websites_i78t.png"
      style="height:80%"
    >
      <h1 class="text-center">
        Configuration incomplète
      </h1>
      <contribs-dataset v-if="configuration.crowdSourcing && !configuration.contribsDataset" />
    </v-img>
  </template>
</template>
