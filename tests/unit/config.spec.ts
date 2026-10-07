import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { createConfig, type ConfigState } from '@/composables/config'
import { field, makeDataset, LABEL_REFERS_TO, START_REFERS_TO, createTestI18n } from './helpers'

const i18n = createTestI18n()

function configError (configuration: Record<string, unknown>) {
  window.APPLICATION = { configuration } as never
  const app = createApp({})
  app.use(createConfig((key, named) => i18n.global.t(key, named ?? {})))
  return (app._context.provides['data-fair-app-config'] as ConfigState).error.value
}

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
