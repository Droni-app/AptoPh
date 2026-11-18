// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import App from '../App.vue'
import { demo, faqs, features } from '../content'
import { headTags, structuredData } from '../seo'
import { PRICE_TIERS, formatCop, tierLabel } from '@aptoph/shared'

describe('landing prerender', () => {
  it('renders the whole content to HTML (crawlable without JavaScript)', async () => {
    const html = await renderToString(createSSRApp(App))

    expect(html.match(/<h1[\s>]/g)).toHaveLength(1)
    for (const feature of features) expect(html).toContain(feature.title)
    for (const faq of faqs) expect(html).toContain(faq.question)
    // Inline brand logo, no external request
    expect(html).toContain('aria-label="AptoPH"')
  })

  it('renders the price per unit by tier with the sign-up link', async () => {
    const html = await renderToString(createSSRApp(App))

    expect(html).toContain('id="precios"')
    for (const tier of PRICE_TIERS) expect(html).toContain(tierLabel(tier))
    expect(html).toContain('/registro?plan=completo&amp;unidades=120')
    // Default: annual cycle, 120 units → $300 × 10 / 12
    expect(html).toContain(formatCop(250))
    expect(html).toContain('/ unidad al mes')
  })

  it('publishes the demo accounts', async () => {
    const html = await renderToString(createSSRApp(App))

    expect(html).toContain('id="demo"')
    for (const account of demo.accounts) expect(html).toContain(account.email)
    expect(html).toContain(demo.password)
  })

  it('builds FAQ structured data from the same content', () => {
    const data = structuredData('https://aptoph.com', 'contacto@aptoph.com')
    const faqPage = data['@graph'].find((node) => node['@type'] === 'FAQPage') as {
      mainEntity: { name: string }[]
    }

    expect(faqPage.mainEntity.map((q) => q.name)).toEqual(faqs.map((faq) => faq.question))
  })

  it('emits canonical and social tags with absolute URLs', () => {
    const head = headTags('https://aptoph.com')

    expect(head).toContain('<link rel="canonical" href="https://aptoph.com/">')
    expect(head).toContain('content="https://aptoph.com/og-image.png"')
    expect(head).toMatch(/<title>[^<]{30,65}<\/title>/)
    expect(head).toMatch(/name="description" content="[^"]{70,160}"/)
  })
})
