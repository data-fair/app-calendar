import { createApp } from 'vue'
// global.scss REMPLACE 'vuetify/styles' — jamais les deux.
// Il compile Vuetify avec $body-font-family: var(--d-body-font-family), variable
// posée par _theme.css : c'est ce qui applique la police du site à la visualisation.
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

window.iFrameResizer = { heightCalculationMethod: 'taggedElement' }
window.vIframeOptions = { reactiveParams: reactiveSearchParams }

async function init () {
  // Le <script> _public.js d'index.html pose window.__PUBLIC_SITE_INFO, lu sans
  // fetch ; l'option siteInfo déclenche refreshSiteInfo, déprécié, et ne reste
  // qu'en repli si le script n'a pas été servi. vuetifySessionOptions lève si la
  // session n'a pas ses infos de site : createSession doit donc être await.
  const session = await createSession({
    directoryUrl: '/simple-directory',
    siteInfo: !window.__PUBLIC_SITE_INFO
  })

  // createI18n APRÈS la session, avec la locale définitive ; app.use(i18n)
  // avant mount(). Ne jamais réassigner i18n.global.locale.value : un changement
  // de langue recharge le document. fallbackLocale: 'en' obligatoire —
  // simple-directory sert six langues, les messages de lib-vuetify n'ont que
  // fr et en ; sans repli, une session d'une autre langue affiche les clés brutes.
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
  // Débloque le service de capture même en cas d'échec d'initialisation
  // (sinon chaque capture attend le délai complet de df:capture-delay).
  window.triggerCapture?.()
})
