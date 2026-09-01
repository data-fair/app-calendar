<script setup lang="ts">
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
    :headline="t('app.incompleteConfig')"
    icon="mdi-calendar"
  />
</template>
