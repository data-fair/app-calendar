// The configurations used by all e2e tests.
// Each config references a dataset via `dataset` (key in datasets.ts) and
// contains the full configuration object (chart, color, views, fields) that
// the app receives via window.APPLICATION.configuration.
//
// Tests inject one of these configs via postMessage('set-config') to validate
// a specific feature / view / admin scenario.
import configsJson from './_configs.json' with { type: 'json' }

export type ConfigName = keyof typeof configsJson

export interface ConfigEntry {
  /** Dataset key from ./datasets.ts */
  dataset: keyof typeof import('./datasets').datasets
  /** Short description of what this config exercises */
  comment: string
  /** The configuration object (matches window.APPLICATION.configuration) */
  config: Record<string, any>
}

export const configs: Record<ConfigName, ConfigEntry> = configsJson as unknown as Record<ConfigName, ConfigEntry>
