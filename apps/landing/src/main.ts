import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/inter'
import './assets/main.css'

import { createApp, createSSRApp } from 'vue'
import { findPage, pages } from './pages'

const container = document.querySelector('#app')!
const page = findPage(location.pathname) ?? pages[0]!
const { default: component } = await page.load()

// The production build is prerendered (scripts/prerender.ts): hydrate that HTML.
// In `vite dev` the container is empty, so mount normally.
const app = container.hasChildNodes() ? createSSRApp(component) : createApp(component)
app.mount(container)
