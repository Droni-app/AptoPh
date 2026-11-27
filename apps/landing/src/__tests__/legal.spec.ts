// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  COMPANY,
  LEGAL_DOCUMENTS,
  LEGAL_DOCUMENT_ORDER,
  legalUrl,
  legalVersionLabel,
} from '@aptoph/shared'
import { findPage, normalizePath, pages } from '../pages'
import { headTags } from '../seo'

async function render(path: string) {
  const page = findPage(path)
  if (!page) throw new Error(`No page for ${path}`)
  const { default: component } = await page.load()
  return renderToString(createSSRApp(component))
}

describe('legal pages', () => {
  it('has a page for every legal document, at the URL the apps link to', () => {
    for (const id of LEGAL_DOCUMENT_ORDER) {
      const url = legalUrl('https://aptoph.com', id)
      expect(findPage(new URL(url).pathname)).toBeDefined()
    }
    expect(findPage('/legal/')).toBeDefined()
  })

  it.each(LEGAL_DOCUMENT_ORDER)('renders %s with its title, version and company', async (id) => {
    const html = await render(`/legal/${LEGAL_DOCUMENTS[id].slug}/`)

    expect(html.match(/<h1[\s>]/g)).toHaveLength(1)
    expect(html).toContain(LEGAL_DOCUMENTS[id].title)
    expect(html).toContain(legalVersionLabel(id))
    expect(html).toContain(COMPANY.legalName)
    expect(html).toContain(COMPANY.nit)
    expect(html).toContain('aria-current="page"')
  })

  it.each(LEGAL_DOCUMENT_ORDER)('every entry of the %s outline points to a section', async (id) => {
    const html = await render(`/legal/${LEGAL_DOCUMENTS[id].slug}/`)
    const anchors = [...html.matchAll(/href="#([a-z0-9-]+)"/g)]
      .map((match) => match[1]!)
      .filter((anchor) => anchor !== 'contenido')

    expect(anchors.length).toBeGreaterThan(0)
    for (const anchor of anchors) expect(html).toContain(`id="${anchor}"`)
  })

  it('publishes the data controller details in the data policy', async () => {
    const html = await render('/legal/tratamiento-de-datos/')

    for (const value of [COMPANY.address, COMPANY.phone, COMPANY.email, COMPANY.representative])
      expect(html).toContain(value)
    expect(html).toContain('Ley Estatutaria 1581 de 2012')
    expect(html).toContain('DigitalOcean')
  })

  it('links every legal document from the footer of the home page', async () => {
    const html = await render('/')
    for (const id of LEGAL_DOCUMENT_ORDER) expect(html).toContain(`/legal/${LEGAL_DOCUMENTS[id].slug}/`)
  })

  it('gives each page its own canonical URL and title', () => {
    const page = pages.find((p) => p.path === '/legal/cookies/')!
    const head = headTags('https://aptoph.com', page)
    expect(head).toContain('<link rel="canonical" href="https://aptoph.com/legal/cookies/">')
    expect(head).toContain('<title>Política de cookies y almacenamiento local | AptoPH</title>')
  })

  it('normalizes the paths a static host may serve', () => {
    expect(normalizePath('/legal/cookies')).toBe('/legal/cookies/')
    expect(normalizePath('/legal/cookies/index.html')).toBe('/legal/cookies/')
    expect(normalizePath('/?x=1#precios')).toBe('/')
  })
})
