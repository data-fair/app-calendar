import 'vuetify/styles'
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import { vuetifySessionOptions } from '@data-fair/lib-vuetify'
import { createSession } from '@data-fair/lib-vue/session.js'
import { createUiNotif } from '@data-fair/lib-vue/ui-notif'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import App from './App.vue'
import { createConfig } from '@/composables/config'
import { createLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import '@data-fair/frame/lib/d-frame'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'

window.iFrameResizer = { heightCalculationMethod: 'taggedElement' }
window.vIframeOptions = { reactiveParams: reactiveSearchParams }

async function init () {
  const session = await createSession({ directoryUrl: '/simple-directory', siteInfo: true })
  const app = createApp(App)
  app.use(createVuetify({
    ...vuetifySessionOptions(session),
    icons: { defaultSet: 'mdi', aliases, sets: { mdi } }
  }))
  app.use(createUiNotif())
  app.use(createConfig())
  app.use(createLocaleDayjs('fr'))
  app.mount('#app')
}
init()
