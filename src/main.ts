import { createApp } from 'vue'
// global.scss REPLACES 'vuetify/styles' — never both.
// It compiles Vuetify with $body-font-family: var(--d-body-font-family), a variable
// set by _theme.css: this is what applies the site font to the visualization.
import '@data-fair/lib-vuetify/style/global.scss'
import { createVuetify } from 'vuetify'
import { vuetifySessionOptions } from '@data-fair/lib-vuetify'
import { createSession } from '@data-fair/lib-vue/session.js'
import { createUiNotif } from '@data-fair/lib-vue/ui-notif'
import { createI18n } from 'vue-i18n'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import App from './App.vue'
import { createConfig } from '@/composables/config'
import { createLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import { messages } from '@/locales'
import '@data-fair/frame/lib/d-frame'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'

window.vIframeOptions = { reactiveParams: reactiveSearchParams }

async function init () {
  // The _public.js <script> of index.html sets window.__PUBLIC_SITE_INFO, read without
  // fetch; the siteInfo option triggers the deprecated refreshSiteInfo, and only remains
  // as a fallback if the script was not served. vuetifySessionOptions throws if the
  // session lacks its site info: createSession must therefore be awaited.
  const session = await createSession({
    directoryUrl: '/simple-directory',
    siteInfo: !window.__PUBLIC_SITE_INFO
  })

  // createI18n AFTER the session, with the final locale; app.use(i18n)
  // before mount(). Never reassign i18n.global.locale.value: a language
  // change reloads the document. fallbackLocale: 'en' is mandatory —
  // simple-directory serves six languages, lib-vuetify messages only have
  // fr and en; without a fallback, a session in another language shows raw keys.
  const i18n = createI18n({
    legacy: false,
    locale: session.lang.value,
    fallbackLocale: 'en',
    messages,
    escapeParameterHtml: true
  })

  const app = createApp(App)
  app.use(createVuetify({
    ...vuetifySessionOptions(session),
    icons: { defaultSet: 'mdi', aliases, sets: { mdi } }
  }))
  app.use(session)
  app.use(i18n)
  app.use(createUiNotif())
  app.use(createConfig((key, named) => i18n.global.t(key, named ?? {})))
  app.use(createLocaleDayjs(session.lang.value))
  app.mount('#app')
}

init().catch((e) => {
  console.error('Failed to initialize app', e)
  // Unblocks the capture service even when initialization fails
  // (otherwise every capture waits for the full df:capture-delay).
  window.triggerCapture?.()
})
