import 'vuetify/styles'
import { createApp } from 'vue'
import { createVuetify } from 'vuetify/lib/framework.mjs'
import { defaultOptions } from '@data-fair/lib/vuetify.js'
import App from './App.vue'

const app = createApp(App)
defaultOptions.defaults = {
  VExpansionPanels: {
    mandatory: 'force'
  }
}
app.use(createVuetify(defaultOptions))
app.mount('#app')
