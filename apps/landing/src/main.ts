import '@fontsource-variable/outfit'
import '@fontsource-variable/inter'
import './assets/main.css'

import { createApp, createSSRApp } from 'vue'
import App from './App.vue'

const container = document.querySelector('#app')!

// The production build is prerendered (scripts/prerender.ts): hydrate that HTML.
// In `vite dev` the container is empty, so mount normally.
const app = container.hasChildNodes() ? createSSRApp(App) : createApp(App)
app.mount(container)
