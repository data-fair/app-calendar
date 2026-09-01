import { inject, computed, ref, toRaw, type App, type Ref } from 'vue'
import type { Application, Dataset, Field } from '@data-fair/lib-common-types/application/index.js'
import type { Config, ReglageDesCouleurs } from '@/config'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import createDFrameAdapter from '@data-fair/frame/lib/vue-reactive/state-change-adapter.js'

export type Translate = (key: string, named?: Record<string, unknown>) => string

export type EditionConfig = {
  formWidth?: number
  minDate?: string
  maxDate?: string
}

export interface ConfigState {
  application: Application
  config: Ref<Config & EditionConfig>
  setConfig: (newConfig: Config & EditionConfig) => void
  notifyConfigChange: (field: string, value: unknown) => void
  dataset: Ref<Dataset | undefined>
  fields: Ref<Record<string, Field>>
  datasetUrl: Ref<string | undefined>
  finalizedAt: Ref<string | undefined>
  labelField: Ref<string | undefined>
  startDateField: Ref<string | undefined>
  startDateType: Ref<string | undefined>
  endDateField: Ref<string | undefined>
  endDateType: Ref<string | undefined>
  dateField: Ref<string | undefined>
  dateType: Ref<string | undefined>
  openingHoursField: Ref<string | undefined>
  attachmentField: Ref<Field | false | undefined>
  imageField: Ref<string | undefined>
  linkField: Ref<string | undefined>
  descriptionField: Ref<string | undefined>
  color: Ref<ReglageDesCouleurs | undefined>
  isAdmin: Ref<boolean>
  layout: Ref<string>
  error: Ref<string | null>,
  dFrameAdapter: ReturnType<typeof createDFrameAdapter>
  accessKey: string | null
}

const dFrameAdapter = createDFrameAdapter(reactiveSearchParams)

const last = window.APPLICATION?.exposedUrl?.split('/').pop()
const toks = last?.split('%3A')
const accessKey = (toks?.length === 2) ? toks[0] : null

export function createConfig (t: Translate) {
  const application = window.APPLICATION as Application & { href: string }
  const config = ref<Config & EditionConfig>((application?.configuration || {}) as Config & EditionConfig)

  const dataset = computed(() => config.value?.datasets?.[0] as Dataset | undefined)

  const fields = computed(() => {
    const schema = dataset.value?.schema || []
    return schema.reduce((acc: Record<string, Field>, field: Field) => {
      if (field.key) acc[field.key] = field
      return acc
    }, {})
  })

  const datasetUrl = computed(() => dataset.value?.href)
  const finalizedAt = computed(() => dataset.value?.finalizedAt)

  const schema = computed(() => (dataset.value?.schema || []) as Field[])

  const labelField = computed(() =>
    config.value.labelField?.key || schema.value.find(f => f['x-refersTo'] === 'http://www.w3.org/2000/01/rdf-schema#label')?.key
  )

  const startDateField = computed(() => schema.value.find(f => f['x-refersTo'] === 'https://schema.org/startDate')?.key)
  const startDateType = computed(() => schema.value.find(f => f['x-refersTo'] === 'https://schema.org/startDate')?.format)
  const endDateField = computed(() => schema.value.find(f => f['x-refersTo'] === 'https://schema.org/endDate')?.key)
  const endDateType = computed(() => schema.value.find(f => f['x-refersTo'] === 'https://schema.org/endDate')?.format)
  const dateField = computed(() => schema.value.find(f => f['x-refersTo'] === 'http://schema.org/Date')?.key)
  const dateType = computed(() => schema.value.find(f => f['x-refersTo'] === 'http://schema.org/Date')?.format)
  const openingHoursField = computed(() => schema.value.find(f => f['x-refersTo'] === 'https://schema.org/openingHours')?.key)
  const attachmentField = computed(() => (!dataset.value?.attachmentsAsImage && schema.value.find(f => f['x-refersTo'] === 'http://schema.org/DigitalDocument')) || undefined)
  const imageField = computed(() => schema.value.find(f => f['x-refersTo'] === 'http://schema.org/image')?.key)
  const linkField = computed(() => schema.value.find(f => f['x-refersTo'] === 'https://schema.org/WebPage')?.key)
  const descriptionField = computed(() => config.value.descriptionField?.key || schema.value.find(f => f['x-refersTo'] === 'http://schema.org/description')?.key)
  const color = computed(() => config.value.color)

  const userPermissions = computed(() => (dataset.value?.userPermissions || []) as string[])
  const isAdmin = computed(() =>
    userPermissions.value.includes('readLines') &&
    userPermissions.value.includes('createLine') &&
    userPermissions.value.includes('updateLine') &&
    userPermissions.value.includes('patchLine') &&
    userPermissions.value.includes('deleteLine') &&
    (!reactiveSearchParams.role || reactiveSearchParams.role === 'admin')
  )
  const layout = computed(() => dataset.value?.isRest && isAdmin.value ? 'admin' : 'simple')

  const error = computed(() => {
    if (!config.value) return t('errors.noConfig')
    if (!dataset.value) return t('errors.noDataset')
    if (!labelField.value) return t('errors.noLabelField')
    if (!startDateField.value && !dateField.value) return t('errors.noDateField')
    return null
  })

  function setConfig (newConfig: any) {
    config.value = newConfig
  }

  function notifyConfigChange (field: string, value: unknown) {
    if (window.parent !== window) {
      // L'origine du parent (backoffice data-fair) est déduite du referrer ;
      // repli '*' si le referrer est masqué par une referrer-policy.
      let targetOrigin = '*'
      try {
        if (document.referrer) targetOrigin = new URL(document.referrer).origin
      } catch { targetOrigin = '*' }
      window.parent.postMessage({
        type: 'set-config',
        content: { field, value }
      }, targetOrigin)
    }
  }

  function setByPath (obj: Record<string, unknown>, path: string, value: unknown) {
    const keys = path.split('.')
    let current: any = obj
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {}
      } else {
        current[key] = Array.isArray(current[key]) ? [...current[key]] : { ...current[key] }
      }
      current = current[key]
    }
    current[keys[keys.length - 1]] = value
  }

  return {
    install (app: App) {
      app.provide('data-fair-app-config', {
        application,
        config,
        setConfig,
        notifyConfigChange,
        dataset,
        fields,
        datasetUrl,
        finalizedAt,
        labelField,
        startDateField,
        startDateType,
        endDateField,
        endDateType,
        dateField,
        dateType,
        openingHoursField,
        attachmentField,
        imageField,
        linkField,
        descriptionField,
        color,
        isAdmin,
        layout,
        error,
        dFrameAdapter,
        accessKey
      })

      window.addEventListener('message', (event) => {
        if (event.data?.type === 'set-config' && event.data?.content) {
          const { content } = event.data
          if (content.configuration) {
            config.value = content.configuration
          } else if (content.chart || content.datasets || content.layers || content.metrics) {
            // Fusionner avec la config existante plutôt qu'écraser : certains
            // émetteurs n'envoient qu'un sous-arbre modifié (perte des champs frères sinon).
            config.value = { ...toRaw(config.value), ...content }
          } else if (content.field && 'value' in content) {
            const newConfig = JSON.parse(JSON.stringify(config.value))
            setByPath(newConfig, content.field, content.value)
            config.value = newConfig
          }
        }
      })
    }
  }
}

export function useConfig (): ConfigState {
  const config = inject<ConfigState>('data-fair-app-config')
  if (!config) throw new Error('useConfig requires using the plugin createConfig')
  return config
}

export default useConfig
