<script setup lang="ts">
import { mdiCalendar } from '@mdi/js'
import { defineAsyncComponent, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfig } from '@/composables/config'
import { ofetch } from 'ofetch'

const { t } = useI18n()
const { error } = useConfig()

watch(error, (message) => {
  if (!message) return
  ofetch(window.APPLICATION.href + '/error', { body: { message }, method: 'POST' }).catch(() => undefined)
  // Débloque le service de capture même sur configuration invalide
  // (sinon chaque capture attend le délai complet de df:capture-delay).
  window.triggerCapture?.(false)
}, { immediate: true })

// embedded, the app lets its host paint the background
const embedded = window.self !== window.top

const Calendar = defineAsyncComponent(() => import('./components/Calendar.vue'))
const SnackBar = defineAsyncComponent(() => import('./components/SnackBar.vue'))
</script>

<template>
  <!-- fixed height app (df:overflow false): it fills its viewport and scrolls inside -->
  <v-app :class="{ 'bg-transparent': embedded }">
    <v-main class="h-screen overflow-hidden">
      <template v-if="!error">
        <calendar />
        <snack-bar />
      </template>
      <v-empty-state
        v-else
        :title="error"
        :headline="t('app.incompleteConfig')"
        :icon="mdiCalendar"
      />
    </v-main>
  </v-app>
</template>
