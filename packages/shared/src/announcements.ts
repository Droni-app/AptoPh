/**
 * Comunicados y circulares. Ver docs/announcements.md.
 */
import type { EnrollmentRole } from './index.js'
import type { ANNOUNCEMENT_AUDIENCES, ValueOf } from './domain.js'
import type { Attachment } from './files.js'

export type AnnouncementAudience = ValueOf<typeof ANNOUNCEMENT_AUDIENCES>

/** Pueden crear, editar y publicar comunicados */
export const ANNOUNCEMENT_WRITE_ROLES: readonly EnrollmentRole[] = [
  'administrator',
  'council_member',
]

export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: 'Todo el conjunto',
  residents: 'Residentes',
  owners: 'Propietarios',
  council: 'Consejo de administración',
  staff: 'Personal y vigilancia',
}

/** Audiencias que se pueden limitar a algunas torres (las que dependen de las unidades) */
export const BUILDING_AUDIENCES: readonly AnnouncementAudience[] = ['all', 'residents', 'owners']

/** Borrador (sin fecha), programado (fecha futura) o publicado */
export const ANNOUNCEMENT_STATUSES = ['draft', 'scheduled', 'published'] as const
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number]

export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = {
  draft: 'Borrador',
  scheduled: 'Programado',
  published: 'Publicado',
}

export const ANNOUNCEMENT_TITLE_MAX = 200
/** Characters of the body's HTML (rich text, docs/announcements.md) */
export const ANNOUNCEMENT_BODY_MAX = 20_000

/** Image (poster) of a comunicado: shown above the text and in the email */
export const ANNOUNCEMENT_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const
export const ANNOUNCEMENT_IMAGE_MAX_MB = 10
export const ANNOUNCEMENT_IMAGE_ACCEPT = ANNOUNCEMENT_IMAGE_EXTENSIONS.map((ext) => `.${ext}`).join(
  ',',
)

/** Why a file cannot be the image of a comunicado, or null if it can */
export function announcementImageProblem(file: { name: string; size: number }): string | null {
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
  if (!(ANNOUNCEMENT_IMAGE_EXTENSIONS as readonly string[]).includes(ext))
    return 'La imagen debe ser JPG, PNG, WEBP o GIF'
  if (file.size > ANNOUNCEMENT_IMAGE_MAX_MB * 1024 * 1024)
    return `La imagen pesa más de ${ANNOUNCEMENT_IMAGE_MAX_MB} MB`
  if (file.size === 0) return 'El archivo está vacío'
  return null
}

/** The image of a comunicado, with a signed link that expires in a few minutes */
export interface AnnouncementImage {
  id: string
  fileName: string
  url: string
}

/** Comunicado en el backoffice */
export interface Announcement {
  id: string
  title: string
  /** Texto con formato: HTML saneado por la API (p, strong, em, u, s, h3, ul, ol, li, a, blockquote) */
  body: string
  audience: AnnouncementAudience
  /** Torres a las que va; vacío = todas */
  buildings: Array<{ id: string; name: string }>
  status: AnnouncementStatus
  publishedAt: string | null
  isPinned: boolean
  sendEmail: boolean
  /** Cuándo se envió el correo (una sola vez) */
  emailedAt: string | null
  emailCount: number | null
  /** Debía enviarse por correo, pero el cupo del mes se había agotado */
  emailSkipped: boolean
  createdBy: string | null
  createdAt: string
  updatedAt: string | null
  attachmentCount: number
  /** Destinatarios y cuántos lo leyeron (solo publicados) */
  reads: { read: number; total: number } | null
  /** Imagen (póster) del comunicado */
  image: AnnouncementImage | null
}

export interface AnnouncementDetail extends Announcement {
  attachments: Attachment[]
}

export interface AnnouncementInput {
  title: string
  /** Texto con formato: HTML saneado por la API (p, strong, em, u, s, h3, ul, ol, li, a, blockquote) */
  body: string
  audience: AnnouncementAudience
  buildingIds: string[]
  isPinned: boolean
  sendEmail: boolean
  /** draft: sin publicar · now: publicar ya · schedule: publicar en `publishAt` */
  publish: 'draft' | 'now' | 'schedule'
  /** ISO, obligatorio con publish = schedule */
  publishAt?: string | null
}

/** Destinatario en el reporte de lectura */
export interface AnnouncementReader {
  userId: string
  fullName: string
  /** Unidades o rol, para reconocerlo */
  detail: string | null
  readAt: string | null
}

/** Comunicado en el portal de residentes */
export interface ResidentAnnouncement {
  id: string
  title: string
  /** Texto con formato: HTML saneado por la API (p, strong, em, u, s, h3, ul, ol, li, a, blockquote) */
  body: string
  publishedAt: string
  isPinned: boolean
  readAt: string | null
  attachmentCount: number
  image: AnnouncementImage | null
  /** Plain-text start of the body, for the list */
  excerpt: string
}

export interface ResidentAnnouncementDetail extends ResidentAnnouncement {
  attachments: Attachment[]
}
