import 'vuetify/styles'
import { createApp } from 'vue'
import { createVuetify } from 'vuetify/lib/framework.mjs'
import { defaultOptions } from '@data-fair/lib/vuetify.js'
import App from './App.vue'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'

const options = defaultOptions(reactiveSearchParams)
options.defaults = {
  global: {
    variant: window.APPLICATION?.configuration?.formVariant || 'underlined'
  }
}

const app = createApp(App)

app.use(createVuetify(options))
app.mount('#app')
