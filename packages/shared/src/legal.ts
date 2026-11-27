/**
 * Documentos legales de AptoPH. Única fuente de los datos de la empresa, las rutas
 * de cada documento en la landing y su versión vigente: la API guarda qué versión
 * aceptó cada persona y las apps enlazan a la landing con estos mismos valores.
 *
 * Al cambiar un documento: edita su texto en apps/landing/src/legal/ y sube aquí su
 * `version` (fecha de la nueva versión). Las aceptaciones guardadas conservan la
 * versión anterior.
 */

const values = <const T extends readonly string[]>(...items: T) => items

/** Empresa que presta el servicio y responde por él */
export const COMPANY = {
  legalName: 'Droni.co S.A.S.',
  nit: '900.354.951',
  representative: 'Gustavo Barragán',
  address: 'Calle 16F # 99-72, Bogotá D.C., Colombia',
  city: 'Bogotá D.C.',
  phone: '+57 314 339 0071',
  email: 'contacto@aptoph.com',
  product: 'AptoPH',
  website: 'aptoph.com',
} as const

/**
 * Días que se conserva la información de un conjunto, en modo consulta, después de
 * que termina su servicio (cancelación, prueba o periodo sin pagar): para exportarla
 * antes de que se elimine.
 */
export const DATA_RETENTION_DAYS = 30

export const LEGAL_DOCUMENT_IDS = values('terms', 'privacy', 'data_processing', 'cookies')
export type LegalDocumentId = (typeof LEGAL_DOCUMENT_IDS)[number]

export interface LegalDocument {
  id: LegalDocumentId
  title: string
  /** Ruta en la landing: /legal/<slug>/ */
  slug: string
  /** Fecha de la versión vigente (AAAA-MM-DD) */
  version: string
  summary: string
}

export const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  terms: {
    id: 'terms',
    title: 'Términos y condiciones',
    slug: 'terminos-y-condiciones',
    version: '2026-11-27',
    summary: 'Las reglas de uso de AptoPH, la prueba gratis, los pagos y la cancelación.',
  },
  privacy: {
    id: 'privacy',
    title: 'Política de tratamiento de datos personales',
    slug: 'tratamiento-de-datos',
    version: '2026-11-27',
    summary:
      'Qué datos personales tratamos, para qué, con quién los compartimos y cómo ejercer tus derechos.',
  },
  data_processing: {
    id: 'data_processing',
    title: 'Acuerdo de encargo del tratamiento de datos',
    slug: 'encargo-de-datos',
    version: '2026-11-27',
    summary:
      'Cómo trata AptoPH, por cuenta de cada conjunto, los datos de sus residentes, propietarios y personal.',
  },
  cookies: {
    id: 'cookies',
    title: 'Política de cookies y almacenamiento local',
    slug: 'cookies',
    version: '2026-11-27',
    summary: 'Qué guardamos en tu navegador y para qué.',
  },
}

/** Orden en el que se listan los documentos */
export const LEGAL_DOCUMENT_ORDER: LegalDocumentId[] = [
  'terms',
  'privacy',
  'data_processing',
  'cookies',
]

/**
 * Documentos que acepta cada quien:
 * - quien registra un conjunto: términos, política de datos y, en nombre del
 *   conjunto, el acuerdo de encargo;
 * - quien acepta una invitación: términos y política de datos.
 */
export const SIGNUP_LEGAL_DOCUMENTS: LegalDocumentId[] = ['terms', 'privacy', 'data_processing']
export const INVITATION_LEGAL_DOCUMENTS: LegalDocumentId[] = ['terms', 'privacy']

/** https://aptoph.com/legal/terminos-y-condiciones/ */
export function legalUrl(siteUrl: string, id: LegalDocumentId) {
  return `${siteUrl.replace(/\/$/, '')}/legal/${LEGAL_DOCUMENTS[id].slug}/`
}

/** "27 de noviembre de 2026" */
export function legalVersionLabel(id: LegalDocumentId) {
  const [year, month, day] = LEGAL_DOCUMENTS[id].version.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, day!)).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
