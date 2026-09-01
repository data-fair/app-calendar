<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiDelete } from '@mdi/js'
import { useConfig } from '@/composables/config'
import { timestamp } from '@/composables/useCalendarData'
import { useAsyncAction } from '@data-fair/lib-vue/async-action'
import { ofetch } from 'ofetch'

const { t } = useI18n()
const { dataset: mainDataset } = useConfig()

const deleteMenuOpen = ref(false)

const prop = defineProps({
  event: {
    type: [Object, null],
    required: true
  }
})

const emit = defineEmits(['deleted'])

const { execute: deleteEventAction, loading: deleteLoading } = useAsyncAction(
  async () => {
    if (!prop.event) return
    await ofetch(`${mainDataset.value?.href}/lines/${prop.event.originalId}`, { method: 'DELETE' })
    deleteMenuOpen.value = false
    emit('deleted')
    timestamp.value = new Date().getTime()
  },
  { error: t('events.deleteError') }
)
</script>

<template>
  <v-menu
    v-model="deleteMenuOpen"
    :close-on-content-click="false"
    persistent
    min-width="300px"
    max-width="500px"
  >
    <template #activator="{ props }">
      <v-btn
        v-tooltip="{
          text: t('events.delete'),
          location: 'right',
          openDelay: '500'
        }"
        :aria-label="t('events.delete')"
        :icon="mdiDelete"
        color="error"
        v-bind="props"
      />
    </template>
    <v-card
      border
      data-iframe-height
    >
      <v-card-title primary-title>
        {{ t('events.deleteTitle') }}
      </v-card-title>
      <v-card-text>
        <v-alert
          :model-value="true"
          type="error"
        >
          {{ event?.openingHours ? t('events.deleteConfirmOpeningHours') : t('events.deleteConfirm') }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="deleteMenuOpen = false"
        >
          {{ t('events.cancel') }}
        </v-btn>
        <v-btn
          color="error"
          :loading="deleteLoading"
          @click="deleteEventAction()"
        >
          {{ t('events.delete') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
