<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Vjsf from '@koumoul/vjsf'
import VjsfMarkdown from '@koumoul/vjsf-markdown'
import { v2compat } from '@koumoul/vjsf/compat/v2'
import { ofetch } from 'ofetch'
import { useFetch } from '@data-fair/lib-vue/fetch.js'
import { useAsyncAction } from '@data-fair/lib-vue/async-action.js'
import { useUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { useConfig } from '@/composables/config'
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import OpeningHoursNode from './OpeningHoursNode.vue'
import {
  changedValues,
  findException,
  parseExceptions,
  removeOccurrenceException,
  serializeExceptions,
  setOccurrenceException,
  type OccurrenceException,
} from '@/utils/recurrence'

const { t, locale } = useI18n()
const {
  dataset: mainDataset,
  startDateField,
  endDateField,
  dateField,
  startDateType,
  endDateType,
  dateType,
  openingHoursField,
  exceptionsField,
  fields,
} = useConfig()
const { dayjs } = useLocaleDayjs()
const { sendUiNotif } = useUiNotif()

interface VJSFProperty {
  title?: string
  description?: string
  type?: string | string[]
  readOnly?: boolean
  'x-extension'?: string
  'x-concept'?: { id?: string; title?: string; primary?: boolean }
  'x-refersTo'?: string | null
  'x-calculated'?: boolean
  'x-display'?: string
  layout?: unknown
  [key: string]: unknown
}

interface VJSFSchema {
  title?: string
  type?: string | string[]
  properties?: Record<string, VJSFProperty>
  required?: string[]
  [key: string]: unknown
}

const props = defineProps<{
  item: Record<string, unknown>
  pendingEvent?: Record<string, unknown> | null
}>()
const emit = defineEmits(['updated', 'cancel'])

const data = ref<Record<string, unknown> | null>(null)
const valid = ref(false)
const schema = ref<VJSFSchema | null>(null)
const schemaKey = ref(0)
const rawSchema = ref<VJSFSchema | null>(null)
const scope = ref<'occurrence' | 'series'>('series')
const currentExceptions = ref<OccurrenceException[]>([])

const canManageExceptions = computed(() => !!(
  exceptionsField.value &&
  props.item?._id &&
  props.pendingEvent?.recurrenceStart
))
const recurrenceStart = computed(() => props.pendingEvent?.recurrenceStart as string | undefined)
const recurrenceEnd = computed(() => props.pendingEvent?.recurrenceEnd as string | undefined)

const { data: baseSchemaData, error: schemaError } = useFetch(
  computed(() => mainDataset.value?.href
    ? `${mainDataset.value.href}/safe-schema?arrays=true&extension=true&mimeType=application%2Fschema%2Bjson`
    : null
  )
)

function hiddenKey (key: string): boolean {
  if (key.startsWith('_') || key === exceptionsField.value) return true
  return scope.value === 'occurrence' && key === openingHoursField.value
}

function buildSchema (raw: VJSFSchema) {
  const local: VJSFSchema = JSON.parse(JSON.stringify(raw))
  const properties = local.properties ?? {}

  for (const [key, prop] of Object.entries(properties)) {
    if (!prop.title) prop.title = key
  }

  for (const [key, prop] of Object.entries(properties)) {
    // calculated and extension columns are computed by data-fair, a line body cannot carry them
    if (hiddenKey(key) || prop['x-calculated'] || prop['x-extension']) {
      delete properties[key]
      continue
    }
    if (prop['x-concept']?.id === 'attachment') {
      prop['x-originalKey'] = key
    }
    if (prop['x-refersTo'] === 'https://schema.org/openingHours') {
      prop.layout = { ...((prop.layout as Record<string, unknown>) || {}), comp: 'opening-hours' }
    }
  }

  if (local.required) local.required = local.required.filter(key => !hiddenKey(key))
  local.properties = properties
  schema.value = local
  schemaKey.value++
}

watch(baseSchemaData, (raw) => {
  if (!raw) return
  rawSchema.value = v2compat(raw as any) as VJSFSchema
  buildSchema(rawSchema.value)
  initData()
}, { immediate: true })

watch(schemaError, (e) => {
  if (e) sendUiNotif({ type: 'error', msg: t('events.formLoadError') })
})

function toISOAware (value: unknown, fieldType?: string): string | null {
  if (!value) return null
  const str = String(value)
  // Une valeur au format "date" seule n'est valide que pour les champs de type
  // "date". Pour un champ date-time il faut une ISO complète, sinon le
  // formulaire vjsf rejette la valeur ("doit correspondre au format date-time").
  if (fieldType === 'date') return dayjs(str).format('YYYY-MM-DD')
  // Keep the local offset (…T09:00:00+02:00), not UTC (…T07:00:00.000Z): the vjsf
  // time picker reads the hour straight from the string, so a UTC value shows and
  // edits the time shifted by the offset.
  return dayjs(str).format()
}

function normalizeDateFields (record: Record<string, unknown>) {
  if (startDateField.value && record[startDateField.value]) {
    record[startDateField.value] = toISOAware(record[startDateField.value], startDateType.value)
  } else if (dateField.value && record[dateField.value]) {
    record[dateField.value] = toISOAware(record[dateField.value], dateType.value)
  }
  if (endDateField.value && record[endDateField.value]) {
    record[endDateField.value] = toISOAware(record[endDateField.value], endDateType.value)
  }
}

// the series values as they apply to this occurrence, before any exception
function occurrenceBaseline (): Record<string, unknown> {
  const baseline: Record<string, unknown> = { ...props.item }
  if (startDateField.value) baseline[startDateField.value] = recurrenceStart.value
  else if (dateField.value) baseline[dateField.value] = recurrenceStart.value
  if (endDateField.value) baseline[endDateField.value] = recurrenceEnd.value
  normalizeDateFields(baseline)
  if (exceptionsField.value) delete baseline[exceptionsField.value]
  return baseline
}

// the occurrence as currently displayed: series values, stored exception, then drag position
function occurrenceSource (): Record<string, unknown> {
  const source = occurrenceBaseline()
  const exception = recurrenceStart.value ? findException(currentExceptions.value, recurrenceStart.value) : undefined
  if (exception?.values) Object.assign(source, exception.values)

  const pending = props.pendingEvent
  if (pending) {
    if (startDateField.value) {
      const value = pending[startDateField.value] ?? pending.start
      if (value) source[startDateField.value] = value
    } else if (dateField.value) {
      const value = pending[dateField.value] ?? pending.start
      if (value) source[dateField.value] = value
    }
    if (endDateField.value) {
      const value = pending[endDateField.value] ?? pending.end
      if (value) source[endDateField.value] = value
    }
  }
  normalizeDateFields(source)
  if (exceptionsField.value) delete source[exceptionsField.value]
  return source
}

function seriesSource (): Record<string, unknown> {
  if (canManageExceptions.value) {
    const source: Record<string, unknown> = { ...props.item }
    normalizeDateFields(source)
    if (exceptionsField.value) delete source[exceptionsField.value]
    return source
  }
  // non-recurring events: keep the historical behaviour, a drag or a creation
  // carries the new dates in pendingEvent
  const initial: Record<string, unknown> = { ...props.item }
  const source = props.pendingEvent ?? props.item
  if (startDateField.value && source[startDateField.value]) {
    initial[startDateField.value] = toISOAware(source[startDateField.value], startDateType.value)
  } else if (dateField.value && source[dateField.value]) {
    initial[dateField.value] = toISOAware(source[dateField.value], dateType.value)
  }
  if (endDateField.value && source[endDateField.value]) {
    initial[endDateField.value] = toISOAware(source[endDateField.value], endDateType.value)
  }
  if (exceptionsField.value) delete initial[exceptionsField.value]
  return initial
}

function initData () {
  if (!props.item) {
    data.value = {}
    return
  }
  data.value = canManageExceptions.value && scope.value === 'occurrence' ? occurrenceSource() : seriesSource()
}

watch(scope, () => {
  if (rawSchema.value) buildSchema(rawSchema.value)
  initData()
})

watch(() => props.item, () => {
  currentExceptions.value = exceptionsField.value ? parseExceptions(props.item?.[exceptionsField.value]) : []
  scope.value = canManageExceptions.value ? 'occurrence' : 'series'
  initData()
}, { immediate: true })

const options = computed(() => ({
  plugins: [VjsfMarkdown],
  density: 'compact',
  titleDepth: 3,
  locale: locale.value,
  removeAdditional: true,
  initialValidation: 'always' as const,
  nodeComponents: {
    'opening-hours': OpeningHoursNode
  },
  components: {
    'opening-hours': { name: 'opening-hours' }
  }
}))

function exceptionType (): string | undefined {
  return exceptionsField.value ? fields.value[exceptionsField.value]?.type as string | undefined : undefined
}

const { execute: saveEvent, loading: submitting } = useAsyncAction(
  async () => {
    if (!data.value || !mainDataset.value?.href) return
    const lineId = props.item._id as string | undefined

    if (scope.value === 'occurrence' && canManageExceptions.value && lineId && exceptionsField.value && recurrenceStart.value) {
      const keys = Object.keys(schema.value?.properties ?? {})
      const values = changedValues(data.value, occurrenceBaseline(), keys)
      const existing = findException(currentExceptions.value, recurrenceStart.value)
      let entries: OccurrenceException[]
      if (Object.keys(values).length) {
        entries = setOccurrenceException(currentExceptions.value, recurrenceStart.value, values)
      } else if (existing) {
        entries = removeOccurrenceException(currentExceptions.value, recurrenceStart.value)
      } else {
        emit('updated')
        return
      }
      await ofetch(`${mainDataset.value.href}/lines/${lineId}`, {
        method: 'PATCH',
        body: { [exceptionsField.value]: serializeExceptions(entries, exceptionType()) }
      })
      currentExceptions.value = entries
      sendUiNotif({ type: 'success', msg: t('events.updated') })
      emit('updated')
      return
    }

    const formData = new FormData()
    const body: Record<string, unknown> = {}
    const schemaKeys = new Set(Object.keys(schema.value?.properties ?? {}))
    for (const [key, value] of Object.entries(data.value)) {
      if (value === null || value === undefined) continue
      if (key === '__file' && value instanceof File) {
        formData.append('attachment', value)
        continue
      }
      // data starts from the whole line: keep only the form's columns
      if (!schemaKeys.has(key)) continue
      body[key] = value
    }
    if (lineId && exceptionsField.value) {
      body[exceptionsField.value] = serializeExceptions(currentExceptions.value, exceptionType())
    }
    // _body: JSON natif, y compris les colonnes tableau/objet que le multipart ne sait pas typer
    formData.append('_body', JSON.stringify(body))
    const url = lineId
      ? `${mainDataset.value.href}/lines/${lineId}`
      : `${mainDataset.value.href}/lines`
    const method = lineId ? 'PUT' : 'POST'
    await ofetch(url, { method, body: formData })
    sendUiNotif({ type: 'success', msg: lineId ? t('events.updated') : t('events.created') })
    emit('updated')
  },
  { error: t('events.saveError') }
)

const { execute: restoreException, loading: restoring } = useAsyncAction(
  async (occurrence: string) => {
    const lineId = props.item._id as string | undefined
    if (!lineId || !exceptionsField.value || !mainDataset.value?.href) return
    const entries = removeOccurrenceException(currentExceptions.value, occurrence)
    await ofetch(`${mainDataset.value.href}/lines/${lineId}`, {
      method: 'PATCH',
      body: { [exceptionsField.value]: serializeExceptions(entries, exceptionType()) }
    })
    currentExceptions.value = entries
    sendUiNotif({ type: 'success', msg: t('events.updated') })
  },
  { error: t('events.saveError') }
)

function exceptionDate (entry: OccurrenceException): string {
  return dayjs((entry.values?.start as string | undefined) ?? entry.occurrence).format('ddd D MMM YYYY, HH:mm')
}

function cancel () {
  emit('cancel')
}
</script>

<template>
  <div
    class="px-2"
    style="max-height: 600px; overflow-y: auto;"
  >
    <template v-if="schema">
      <v-radio-group
        v-if="canManageExceptions"
        v-model="scope"
        inline
        density="compact"
        hide-details
        class="mb-3"
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
      <v-form v-model="valid">
        <vjsf
          :key="schemaKey"
          v-model="data"
          :schema="schema"
          :options="options"
        />
      </v-form>
      <template v-if="scope === 'series' && canManageExceptions && currentExceptions.length">
        <v-divider class="my-3" />
        <div class="text-subtitle-2 mb-1">
          {{ t('events.exceptionsTitle') }}
        </div>
        <v-list density="compact">
          <v-list-item
            v-for="entry in currentExceptions"
            :key="entry.occurrence"
          >
            <v-list-item-title>{{ exceptionDate(entry) }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ entry.cancelled ? t('events.exceptionCancelled') : t('events.exceptionModified') }}
            </v-list-item-subtitle>
            <template #append>
              <v-btn
                variant="text"
                size="small"
                :loading="restoring"
                @click="restoreException(entry.occurrence)"
              >
                {{ t('events.restore') }}
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </template>
      <v-card-actions class="px-0 pt-3">
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="submitting"
          @click="cancel"
        >
          {{ t('events.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="submitting"
          :disabled="!valid || submitting"
          @click="saveEvent()"
        >
          {{ t('events.save') }}
        </v-btn>
      </v-card-actions>
    </template>
    <v-row
      v-else
      align="center"
      style="height: 200px"
      class="ma-0"
    >
      <v-col class="text-center">
        <v-progress-circular
          :size="80"
          :width="7"
          color="primary"
          indeterminate
        />
      </v-col>
    </v-row>
  </div>
</template>
