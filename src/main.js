import 'vuetify/styles'
import { createApp } from 'vue'
import { createVuetify } from 'vuetify/lib/framework.mjs'
import { defaultOptions } from '@data-fair/lib-vuetify'
import App from './App.vue'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import { createLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'

async function init () {
  const options = defaultOptions(reactiveSearchParams)
  options.defaults = {
    global: {
      variant: window.APPLICATION?.configuration?.formVariant || 'underlined'
    }
  }

  const app = createApp(App)
  app.use(createVuetify(options)).use(createLocaleDayjs('fr'))
  app.mount('#app')
}

init()
