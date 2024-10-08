<script setup>
import { defineAsyncComponent } from 'vue'
import useAppInfo from './composables/useAppInfo'
import { ofetch } from 'ofetch'

let configureError
try {
  useAppInfo()
} catch (e) {
  configureError = e.message
  ofetch(window.APPLICATION.href + '/error', { body: { message: e.message || e }, method: 'POST' })
}

const Calendar = defineAsyncComponent(() =>
  import('./components/Calendar.vue')
)
const SnackBar = defineAsyncComponent(() =>
  import('./components/SnackBar.vue')
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
    </v-img>
  </template>
</template>
