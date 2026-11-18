import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import '@dronico/droni-kit/dist/droni-kit.css'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { initTheme } from './composables/useTheme'

initTheme()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
