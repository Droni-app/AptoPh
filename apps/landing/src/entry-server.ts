import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import App from './App.vue'
import { headTags, structuredData } from './seo'

/** Used by scripts/prerender.ts at build time (not shipped to the browser) */
export async function render() {
  const siteUrl = import.meta.env.VITE_SITE_URL.replace(/\/$/, '')
  const app = createSSRApp(App)
  const html = await renderToString(app)
  return {
    html,
    siteUrl,
    head: headTags(siteUrl),
    jsonLd: structuredData(siteUrl, import.meta.env.VITE_CONTACT_EMAIL),
  }
}
