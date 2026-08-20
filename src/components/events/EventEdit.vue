<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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

const { dataset: mainDataset, startDateField, endDateField, dateField, startDateType, endDateType } = useConfig()
const { dayjs } = useLocaleDayjs()
const { sendUiNotif } = useUiNotif()

interface VJSFProperty {
  title?: string
  description?: string
  type?: string | string[]
  readOnly?: boolean
  'x-extension'?: boolean
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

const { data: baseSchemaData, error: schemaError } = useFetch(
  computed(() => mainDataset.value?.href
    ? `${mainDataset.value.href}/safe-schema?arrays=true&extension=true&mimeType=application%2Fschema%2Bjson`
    : null
  )
)

function buildSchema (raw: VJSFSchema) {
  const local: VJSFSchema = JSON.parse(JSON.stringify(raw))
  const properties = local.properties ?? {}

  for (const [key, prop] of Object.entries(properties)) {
    if (!prop.title) prop.title = key
  }

  for (const [key, prop] of Object.entries(properties)) {
    if (key.startsWith('_') || prop['x-calculated']) {
      delete properties[key]
      continue
    }
    if (prop['x-concept']?.id === 'attachment') {
      prop['x-originalKey'] = key
    }
  }

  for (const prop of Object.values(properties)) {
    if (prop['x-refersTo'] === 'https://schema.org/openingHours') {
      prop.layout = { ...((prop.layout as Record<string, unknown>) || {}), comp: 'opening-hours' }
    }
  }

  local.properties = properties
  schema.value = local
  schemaKey.value++
}

watch(baseSchemaData, (raw) => {
  if (!raw) return
  const v2 = v2compat(raw as any) as VJSFSchema
  buildSchema(v2)
}, { immediate: true })

watch(schemaError, (e) => {
  if (e) sendUiNotif({ type: 'error', msg: 'Erreur lors du chargement du formulaire' })
})

function toISOAware (value: unknown, fieldType?: string): string | null {
  if (!value) return null
  const str = String(value)
  // Une valeur au format "date" seule n'est valide que pour les champs de type
  // "date". Pour un champ date-time il faut une ISO complète, sinon le
  // formulaire vjsf rejette la valeur ("doit correspondre au format date-time").
  if (/^\d{4}-\d{2}-\d{2}$/.test(str) && fieldType === 'date') return str
  return dayjs(str).toISOString()
}

function initData () {
  if (!props.item) {
    data.value = {}
    return
  }
  const initial: Record<string, unknown> = { ...props.item }
  const source = props.pendingEvent ?? props.item
  if (startDateField.value && source[startDateField.value]) {
    initial[startDateField.value] = toISOAware(source[startDateField.value], startDateType.value)
  } else if (dateField.value && source[dateField.value]) {
    initial[dateField.value] = toISOAware(source[dateField.value])
  }
  if (endDateField.value && source[endDateField.value]) {
    initial[endDateField.value] = toISOAware(source[endDateField.value], endDateType.value)
  }
  data.value = initial
}

watch(() => props.item, () => initData(), { immediate: true })

const options = computed(() => ({
  plugins: [VjsfMarkdown],
  density: 'compact',
  titleDepth: 3,
  locale: 'fr',
  removeAdditional: true,
  initialValidation: 'always' as const,
  nodeComponents: {
    'opening-hours': OpeningHoursNode
  },
  components: {
    'opening-hours': { name: 'opening-hours' }
  }
}))

const { execute: saveEvent, loading: submitting } = useAsyncAction(
  async () => {
    if (!data.value || !mainDataset.value?.href) return
    const formData = new FormData()
    for (const [key, value] of Object.entries(data.value)) {
      if (value === null || value === undefined) continue
      if (key === '__file' && value instanceof File) {
        formData.append('attachment', value)
        continue
      }
      if (typeof value === 'object' && !Array.isArray(value)) {
        formData.append(key, JSON.stringify(value))
      } else {
        formData.append(key, String(value))
      }
    }
    const lineId = props.item._id as string | undefined
    const url = lineId
      ? `${mainDataset.value.href}/lines/${lineId}`
      : `${mainDataset.value.href}/lines`
    const method = lineId ? 'PUT' : 'POST'
    await ofetch(url, { method, body: formData })
    sendUiNotif({ type: 'success', msg: lineId ? 'Événement modifié' : 'Événement créé' })
    emit('updated')
  },
  { error: 'Erreur lors de la sauvegarde de l\'événement' }
)

function cancel () {
  emit('cancel')
}
</script>

<template>
  <div style="max-height: 600px; overflow-y: auto;">
    <template v-if="schema">
      <v-form v-model="valid">
        <vjsf
          :key="schemaKey"
          v-model="data"
          :schema="schema"
          :options="options"
        />
      </v-form>
      <v-card-actions class="px-0 pt-3">
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="submitting"
          @click="cancel"
        >
          Annuler
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="submitting"
          :disabled="!valid || submitting"
          @click="saveEvent()"
        >
          Valider
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
