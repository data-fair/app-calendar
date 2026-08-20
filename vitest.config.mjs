import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [
    vue({
      template: {
        transformAssetUrls,
        compilerOptions: {
          isCustomElement: (tag) => tag === 'd-frame'
        }
      }
    }),
    vuetify({ autoImport: true })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue']
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.spec.ts'],
    restoreMocks: true,
    server: {
      deps: {
        // lib-vue est externalisé par défaut : ses imports natifs (ex. ofetch)
        // échapperaient aux vi.mock. En l'inlinant, tout passe par le graphe de
        // modules vitest et les mocks s'appliquent partout.
        inline: ['@data-fair/lib-vue']
      }
    }
  }
})
