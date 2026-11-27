import type { Component } from 'vue'
import { LEGAL_DOCUMENTS, LEGAL_DOCUMENT_ORDER, type LegalDocumentId } from '@aptoph/shared'
import { site } from './content'

export interface Page {
  /** Always with a trailing slash: /legal/cookies/ */
  path: string
  title: string
  description: string
  load: () => Promise<{ default: Component }>
}

const documents: Record<LegalDocumentId, Page['load']> = {
  terms: () => import('./legal/TermsDocument.vue'),
  privacy: () => import('./legal/PrivacyDocument.vue'),
  data_processing: () => import('./legal/DataProcessingDocument.vue'),
  cookies: () => import('./legal/CookiesDocument.vue'),
}

/** Every prerendered page of the landing */
export const pages: Page[] = [
  {
    path: '/',
    title: site.title,
    description: site.description,
    load: () => import('./App.vue'),
  },
  {
    path: '/legal/',
    title: 'Documentos legales | AptoPH',
    description:
      'Términos y condiciones, política de tratamiento de datos personales, acuerdo de encargo y cookies de AptoPH.',
    load: () => import('./legal/LegalIndex.vue'),
  },
  ...LEGAL_DOCUMENT_ORDER.map((id) => ({
    path: `/legal/${LEGAL_DOCUMENTS[id].slug}/`,
    title: `${LEGAL_DOCUMENTS[id].title} | AptoPH`,
    description: `${LEGAL_DOCUMENTS[id].summary} AptoPH, de Droni.co S.A.S.`,
    load: documents[id],
  })),
]

/** "/legal/cookies", "/legal/cookies/index.html" → "/legal/cookies/" */
export function normalizePath(path: string) {
  const clean = path.split(/[?#]/)[0]!.replace(/index\.html$/, '')
  return clean.endsWith('/') ? clean : `${clean}/`
}

export function findPage(path: string) {
  return pages.find((page) => page.path === normalizePath(path))
}
