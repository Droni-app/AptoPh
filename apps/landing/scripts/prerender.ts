/**
 * Prerenders the landing into dist/index.html so crawlers get the full content
 * without running JavaScript, then writes robots.txt and sitemap.xml.
 *
 * Runs after `vite build` (client) and `vite build --ssr src/entry-server.ts --outDir dist-ssr`.
 */
import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = `${root}dist/`
const ssrDir = `${root}dist-ssr/`

interface RenderResult {
  html: string
  siteUrl: string
  head: string
  jsonLd: unknown
}

const { render } = (await import(`${ssrDir}entry-server.js`)) as {
  render: () => Promise<RenderResult>
}
const { html, siteUrl, head, jsonLd } = await render()

// `<` escaped so the JSON can never close the <script> element
const jsonLdTag = `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`

const template = await readFile(`${dist}index.html`, 'utf8')
for (const marker of ['<!--head-tags-->', '<!--json-ld-->', '<!--app-html-->']) {
  if (!template.includes(marker)) throw new Error(`index.html is missing ${marker}`)
}

// Preload the two Latin font files used above the fold (Plus Jakarta Sans headings, Inter text)
const assets = await readdir(`${dist}assets`)
const preloads = ['plus-jakarta-sans-latin-wght-normal', 'inter-latin-wght-normal']
  .map((prefix) => assets.find((file) => file.startsWith(prefix) && file.endsWith('.woff2')))
  .filter((file): file is string => Boolean(file))
  .map(
    (file) => `<link rel="preload" href="/assets/${file}" as="font" type="font/woff2" crossorigin>`,
  )
  .join('\n    ')

const page = template
  .replace('<!--head-tags-->', `${head}\n    ${preloads}`)
  .replace('<!--json-ld-->', jsonLdTag)
  .replace('<!--app-html-->', html)

await writeFile(`${dist}index.html`, page)

const today = new Date().toISOString().slice(0, 10)
await writeFile(
  `${dist}sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${today}</lastmod>
  </url>
</urlset>
`,
)
await writeFile(`${dist}robots.txt`, `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`)

await rm(ssrDir, { recursive: true, force: true })

console.log(`Prerendered dist/index.html (${(page.length / 1024).toFixed(1)} kB) for ${siteUrl}`)
