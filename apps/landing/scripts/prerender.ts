/**
 * Prerenders every page of the landing (src/pages.ts) into dist/<path>/index.html so
 * crawlers get the full content without running JavaScript, then writes robots.txt
 * and sitemap.xml.
 *
 * Runs after `vite build` (client) and `vite build --ssr src/entry-server.ts --outDir dist-ssr`.
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = `${root}dist/`
const ssrDir = `${root}dist-ssr/`

interface RenderedPage {
  path: string
  html: string
  head: string
  jsonLd: unknown
}

const { renderPages } = (await import(`${ssrDir}entry-server.js`)) as {
  renderPages: () => Promise<{ siteUrl: string; pages: RenderedPage[] }>
}
const { siteUrl, pages } = await renderPages()

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

for (const page of pages) {
  // `<` escaped so the JSON can never close the <script> element
  const jsonLdTag = page.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(page.jsonLd).replace(/</g, '\\u003c')}</script>`
    : ''
  const output = template
    .replace('<!--head-tags-->', `${page.head}\n    ${preloads}`)
    .replace('<!--json-ld-->', jsonLdTag)
    .replace('<!--app-html-->', page.html)

  const dir = `${dist}${page.path.slice(1)}`
  await mkdir(dir, { recursive: true })
  await writeFile(`${dir}index.html`, output)
  console.log(`Prerendered ${page.path} (${(output.length / 1024).toFixed(1)} kB)`)
}

const today = new Date().toISOString().slice(0, 10)
const urls = pages
  .map(
    (page) => `  <url>
    <loc>${siteUrl}${page.path}</loc>
    <lastmod>${today}</lastmod>
  </url>`,
  )
  .join('\n')
await writeFile(
  `${dist}sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
)
await writeFile(`${dist}robots.txt`, `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`)

await rm(ssrDir, { recursive: true, force: true })

console.log(`${pages.length} pages for ${siteUrl}`)
