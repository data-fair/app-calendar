import { createApp, ref } from 'vue'
import { createVuetify } from 'vuetify'
import { createI18n } from 'vue-i18n'
import { createLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import { createUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { messages } from '@/locales'
import type { ConfigState } from '@/composables/config'
import type { Config } from '@/config'
import type { Dataset, Field } from '@data-fair/lib-common-types/application/index.js'

export const LABEL_REFERS_TO = 'http://www.w3.org/2000/01/rdf-schema#label'
export const START_REFERS_TO = 'https://schema.org/startDate'
export const END_REFERS_TO = 'https://schema.org/endDate'
export const DATE_REFERS_TO = 'http://schema.org/Date'
export const OPENING_HOURS_REFERS_TO = 'https://schema.org/openingHours'

export function field (key: string, format: string, refersTo?: string): Field {
  const f: Field = { key, title: key, type: 'string', format }
  if (refersTo) f['x-refersTo'] = refersTo
  return f
}

export function makeDataset (schema: Field[], opts: { isRest?: boolean } = {}): Dataset {
  return {
    id: 'dataset-test',
    title: 'Dataset test',
    type: 'csv',
    href: '/api/v1/datasets/dataset-test',
    finalizedAt: '2026-01-01T00:00:00.000Z',
    isRest: opts.isRest ?? true,
    userPermissions: ['readLines', 'createLine', 'updateLine', 'patchLine', 'deleteLine'],
    schema
  } as unknown as Dataset
}

export function makeConfigState (
  dataset: Dataset,
  config: Config = {} as Config,
  opts: { isAdmin?: boolean } = {}
): ConfigState {
  const schema = (dataset.schema || []) as Field[]
  const keyFor = (refersTo: string) => schema.find(f => f['x-refersTo'] === refersTo)?.key
  const formatFor = (refersTo: string) => schema.find(f => f['x-refersTo'] === refersTo)?.format

  const configRef = ref({ ...config, datasets: [dataset] } as unknown as Config)

  return {
    application: {} as never,
    config: configRef,
    setConfig: (newConfig: Config) => { configRef.value = newConfig },
    notifyConfigChange: () => undefined,
    dataset: ref(dataset),
    fields: ref({}),
    datasetUrl: ref(dataset.href),
    finalizedAt: ref(dataset.finalizedAt),
    labelField: ref(config.labelField?.key || keyFor(LABEL_REFERS_TO)),
    startDateField: ref(keyFor(START_REFERS_TO)),
    startDateType: ref(formatFor(START_REFERS_TO)),
    endDateField: ref(keyFor(END_REFERS_TO)),
    endDateType: ref(formatFor(END_REFERS_TO)),
    dateField: ref(keyFor(DATE_REFERS_TO)),
    dateType: ref(formatFor(DATE_REFERS_TO)),
    openingHoursField: ref(keyFor(OPENING_HOURS_REFERS_TO)),
    attachmentField: ref(false),
    imageField: ref(undefined),
    linkField: ref(undefined),
    descriptionField: ref(undefined),
    color: ref(config.color),
    isAdmin: ref(opts.isAdmin ?? false),
    layout: ref(opts.isAdmin ? 'admin' : 'simple'),
    error: ref(null),
    dFrameAdapter: {} as never,
    accessKey: null
  } as unknown as ConfigState
}

export function mountComposable<T> (state: ConfigState, setup: () => T): T {
  let result!: T
  const app = createApp({
    setup () {
      result = setup()
      return () => null
    }
  })
  app.provide('data-fair-app-config', state)
  createLocaleDayjs('fr').install(app)
  createUiNotif().install(app)
  app.use(createI18n({
    legacy: false,
    locale: 'fr',
    fallbackLocale: 'en',
    messages
  }))
  app.use(createVuetify())
  const el = document.createElement('div')
  document.body.appendChild(el)
  app.mount(el)
  return result
}

export function createTestI18n () {
  return createI18n({
    legacy: false,
    locale: 'fr',
    fallbackLocale: 'en',
    messages
  })
}
