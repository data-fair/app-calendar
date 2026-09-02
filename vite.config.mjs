import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { fileURLToPath, URL } from 'node:url'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { settingsPath } from '@data-fair/lib-vuetify/vite.js'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Vite ne peuple pas process.env depuis un .env : passer par loadEnv.
  // Le .env est généré une fois par df-dev-env (ports libres consécutifs).
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.APP_PORT ?? 3000)
  return {
    base: env.PUBLIC_URL ?? '/app/',
    plugins: [
      vue({
        template: {
          transformAssetUrls,
          compilerOptions: {
            isCustomElement: (tag) => tag === 'd-frame'
          }
        }
      }),
      VueI18nPlugin({ strictMessage: false }),
      // https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vite-plugin
      vuetify({
        autoImport: true,
        styles: { configFile: settingsPath }
      }),
      env.ANALYZE && visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap'
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
      extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue']
    },
    optimizeDeps: {
      // Les deps des composants asynchrones (EventEdit → Vjsf) ne sont découvertes
      // qu'à la première demande : en e2e, 4 workers déclenchent une
      // re-optimisation en plein test (reloads pleins, requêtes en échec).
      // Les lister ici force leur pré-bundling au démarrage du serveur.
      include: [
        'ajv-formats', 'ajv-errors', 'ajv/dist/2019.js', 'ajv/dist/standalone/index.js', 'ajv-i18n',
        'debug', 'debug/src/browser.js', 'fast-deep-equal',
        '@koumoul/vjsf', '@koumoul/vjsf/compat/v2', '@koumoul/vjsf-markdown', 'ofetch',
      ]
    },
    server: {
      port,
      strictPort: !!env.APP_PORT,
      // hmr suit le port du serveur : un websocket resté sur un autre port fait
      // tenir deux ports à l'application et annule le port généré.
      hmr: { port, protocol: 'ws' }
    },
    // Préchauffe le graphe de modules au démarrage : sans lui le serveur ne
    // transforme les modules qu'à la première requête et la suite e2e court
    // contre un démarrage à froid (échecs trompeurs type "Failed to fetch
    // dynamically imported module").
    warmup: {
      clientFiles: ['./src/main.ts', './src/**/*.vue']
    }
  }
})
