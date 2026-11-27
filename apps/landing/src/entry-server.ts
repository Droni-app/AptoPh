import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { headTags, structuredData } from './seo'
import { pages } from './pages'

/** Used by scripts/prerender.ts at build time (not shipped to the browser) */
export async function renderPages() {
  const siteUrl = import.meta.env.VITE_SITE_URL.replace(/\/$/, '')
  return Promise.all(
    pages.map(async (page) => {
      const { default: component } = await page.load()
      return {
        path: page.path,
        html: await renderToString(createSSRApp(component)),
        head: headTags(siteUrl, page),
        // The organization, product and FAQ data describe the home page
        jsonLd: page.path === '/' ? structuredData(siteUrl, import.meta.env.VITE_CONTACT_EMAIL) : null,
      }
    }),
  ).then((rendered) => ({ siteUrl, pages: rendered }))
}
