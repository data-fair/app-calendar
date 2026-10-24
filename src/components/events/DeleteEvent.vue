<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiDelete } from '@mdi/js'
import { useConfig } from '@/composables/config'
import { timestamp } from '@/composables/useCalendarData'
import { useAsyncAction } from '@data-fair/lib-vue/async-action'
import { ofetch } from 'ofetch'
import { cancelOccurrence, parseExceptions, serializeExceptions } from '@/utils/recurrence'

const { t } = useI18n()
const { dataset: mainDataset, exceptionsField, fields } = useConfig()

const deleteMenuOpen = ref(false)
const scope = ref<'occurrence' | 'series'>('series')

const prop = defineProps({
  event: {
    type: [Object, null],
    required: true
  },
  item: {
    type: [Object, null],
    default: null
  }
})

const emit = defineEmits(['deleted'])

const canManageException = computed(() => !!(
  exceptionsField.value &&
  prop.item?._id &&
  prop.event?.recurrenceStart
))

watch(() => prop.event, () => {
  scope.value = canManageException.value ? 'occurrence' : 'series'
  deleteMenuOpen.value = false
}, { immediate: true })

watch(canManageException, (can) => {
  scope.value = can ? 'occurrence' : 'series'
})

const { execute: deleteEventAction, loading: deleteLoading } = useAsyncAction(
  async () => {
    if (!prop.event || !mainDataset.value?.href) return
    const lineId = prop.event.originalId as string
    if (scope.value === 'occurrence' && canManageException.value && exceptionsField.value && prop.item) {
      const entries = cancelOccurrence(parseExceptions(prop.item[exceptionsField.value]), String(prop.event.recurrenceStart))
      await ofetch(`${mainDataset.value.href}/lines/${lineId}`, {
        method: 'PATCH',
        body: { [exceptionsField.value]: serializeExceptions(entries, fields.value[exceptionsField.value]?.type) }
      })
    } else {
      await ofetch(`${mainDataset.value.href}/lines/${lineId}`, { method: 'DELETE' })
    }
    deleteMenuOpen.value = false
    emit('deleted')
    timestamp.value = new Date().getTime()
  },
  { error: t('events.deleteError') }
)

const title = computed(() => {
  if (!canManageException.value) return t('events.deleteTitle')
  return scope.value === 'occurrence' ? t('events.deleteOccurrenceTitle') : t('events.deleteSeriesTitle')
})

const confirm = computed(() => {
  if (!canManageException.value) {
    return prop.event?.openingHours ? t('events.deleteConfirmOpeningHours') : t('events.deleteConfirm')
  }
  return scope.value === 'occurrence' ? t('events.deleteConfirmOccurrence') : t('events.deleteConfirmSeries')
})
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
    <v-card border>
      <v-card-title primary-title>
        {{ title }}
      </v-card-title>
      <v-card-text>
        <v-alert
          :model-value="true"
          :type="scope === 'series' || !canManageException ? 'error' : 'warning'"
        >
          {{ confirm }}
        </v-alert>
        <v-radio-group
          v-if="canManageException"
          v-model="scope"
          density="compact"
          hide-details
          class="mt-2"
          :label="t('events.scopeLabel')"
        >
          <v-radio
            value="occurrence"
            :label="t('events.scopeOccurrence')"
          />
          <v-radio
            value="series"
            :label="t('events.scopeSeries')"
          />
        </v-radio-group>
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
