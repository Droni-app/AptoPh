import { faqs, features, site } from './content'
import type { Page } from './pages'

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

/** <head> tags for SEO and social sharing, injected by the prerender step */
export function headTags(
  siteUrl: string,
  page: Pick<Page, 'path' | 'title' | 'description'> = {
    path: '/',
    title: site.title,
    description: site.description,
  },
) {
  const url = `${siteUrl}${page.path}`
  const image = `${siteUrl}/og-image.png`
  const title = escapeAttr(page.title)
  const description = escapeAttr(page.description)

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${url}">`,
    `<link rel="alternate" hreflang="es-CO" href="${url}">`,
    `<link rel="alternate" hreflang="x-default" href="${url}">`,
    `<meta property="og:type" content="${page.path === '/' ? 'website' : 'article'}">`,
    `<meta property="og:locale" content="es_CO">`,
    `<meta property="og:site_name" content="${site.name}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="AptoPH, software de administración de propiedad horizontal">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${image}">`,
  ].join('\n    ')
}

/**
 * schema.org structured data (JSON-LD) for the landing.
 * Built from the same content the page renders, so they never drift apart.
 */
export function structuredData(siteUrl: string, contactEmail: string) {
  const organizationId = `${siteUrl}/#organization`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: site.name,
        url: `${siteUrl}/`,
        logo: `${siteUrl}/icon-512.png`,
        email: contactEmail,
        areaServed: { '@type': 'Country', name: 'Colombia' },
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: site.name,
        inLanguage: 'es-CO',
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'SoftwareApplication',
        name: site.name,
        url: `${siteUrl}/`,
        description: site.description,
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Software de administración de propiedad horizontal',
        operatingSystem: 'Web, Android, iOS',
        inLanguage: 'es-CO',
        featureList: features.map((feature) => feature.title),
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      },
    ],
  }
}
