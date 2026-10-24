import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { createConfig, type ConfigState } from '@/composables/config'
import { field, makeDataset, LABEL_REFERS_TO, START_REFERS_TO, createTestI18n } from './helpers'

const i18n = createTestI18n()

function configState (configuration: Record<string, unknown>) {
  window.APPLICATION = { configuration } as never
  const app = createApp({})
  app.use(createConfig((key, named) => i18n.global.t(key, named ?? {})))
  return app._context.provides['data-fair-app-config'] as ConfigState
}

function configError (configuration: Record<string, unknown>) {
  return configState(configuration).error.value
}

describe('createConfig.exceptionsField', () => {
  function exceptionsKey (configuration: Record<string, unknown>) {
    return configState(configuration).exceptionsField.value
  }

  const schema = [
    field('title', 'text', LABEL_REFERS_TO),
    field('start', 'date-time', START_REFERS_TO),
    field('exceptions', 'array')
  ]

  it('reste désactivé par défaut et n\'active la colonne que si elle existe', () => {
    expect(exceptionsKey({ datasets: [makeDataset(schema)] })).toBeUndefined()
    expect(exceptionsKey({
      manageRecurrenceExceptions: false,
      recurrenceExceptionsField: { key: 'exceptions' },
      datasets: [makeDataset(schema)]
    })).toBeUndefined()
    expect(exceptionsKey({
      manageRecurrenceExceptions: true,
      recurrenceExceptionsField: { key: 'exceptions' },
      datasets: [makeDataset(schema)]
    })).toBe('exceptions')
    expect(exceptionsKey({
      manageRecurrenceExceptions: true,
      recurrenceExceptionsField: { key: 'unknown' },
      datasets: [makeDataset(schema)]
    })).toBeUndefined()
  })
})

describe('createConfig.error', () => {
  it('signale le premier élément manquant de la configuration', () => {
    const label = field('title', 'text', LABEL_REFERS_TO)
    const start = field('start', 'date-time', START_REFERS_TO)
    expect(configError({})).toBe('Veuillez sélectionner une source de données')
    expect(configError({ datasets: [makeDataset([start])] })).toBe('Veuillez sélectionner un champ de libellé')
    expect(configError({ datasets: [makeDataset([label])] })).toBe('Aucun champ de date trouvé dans le dataset')
    expect(configError({ datasets: [makeDataset([label, start])] })).toBeNull()
    // an explicit label field replaces the label concept
    expect(configError({ labelField: { key: 'start' }, datasets: [makeDataset([start])] })).toBeNull()
  })
})
