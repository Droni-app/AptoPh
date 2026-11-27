/**
 * Archivos adjuntos (tabla `attachments`). Ver docs/files.md.
 */

/** Registros que pueden tener adjuntos */
export const ATTACHMENT_OWNER_TYPES = [
  // Gasto: factura o cuenta de cobro del proveedor
  'bill',
  // Comprobante de egreso (pago a proveedor)
  'vendor_payment',
  // Recibo de caja (pago de una unidad)
  'payment',
  // Comprobante contable: notas de contabilidad y traslados entre cuentas
  'journal_entry',
  // Comunicado
  'announcement',
  // Imagen (póster) de un comunicado: una por comunicado
  'announcement_image',
] as const

export type AttachmentOwnerType = (typeof ATTACHMENT_OWNER_TYPES)[number]

/** Adjuntos que se gestionan desde Finanzas (con los permisos de finanzas) */
export const FINANCE_ATTACHMENT_OWNER_TYPES = [
  'bill',
  'vendor_payment',
  'payment',
  'journal_entry',
] as const satisfies readonly AttachmentOwnerType[]
export type FinanceAttachmentOwnerType = (typeof FINANCE_ATTACHMENT_OWNER_TYPES)[number]

/** Tamaño máximo de un archivo */
export const ATTACHMENT_MAX_MB = 10
export const ATTACHMENT_MAX_BYTES = ATTACHMENT_MAX_MB * 1024 * 1024

/** Archivos activos por registro */
export const ATTACHMENT_MAX_PER_OWNER = 20

/** Comprobantes que un residente puede adjuntar a un pago que reportó */
export const RESIDENT_ATTACHMENT_MAX = 5

/** Extensiones permitidas: documentos, hojas de cálculo e imágenes (incluye fotos de celular) */
export const ATTACHMENT_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'heif',
  'xls',
  'xlsx',
  'csv',
  'doc',
  'docx',
] as const

/** Valor para el atributo `accept` de un input de archivo */
export const ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.map((ext) => `.${ext}`).join(',')

export interface Attachment {
  id: string
  ownerType: AttachmentOwnerType
  ownerId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  /** Nombre de quien lo subió */
  uploadedBy: string | null
  createdAt: string
}

function extensionOf(name: string) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

const allowedExtensions = new Set<string>(ATTACHMENT_EXTENSIONS)

/** Por qué un archivo no se puede adjuntar, o null si se puede (validación previa en las apps) */
export function attachmentProblem(file: { name: string; size: number }): string | null {
  if (!allowedExtensions.has(extensionOf(file.name)))
    return `${file.name}: tipo de archivo no permitido (PDF, imágenes, Excel o Word)`
  if (file.size > ATTACHMENT_MAX_BYTES) return `${file.name}: pesa más de ${ATTACHMENT_MAX_MB} MB`
  if (file.size === 0) return `${file.name}: el archivo está vacío`
  return null
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MB`
}

/** Ícono de Material Design Icons para un archivo */
export function attachmentIcon(name: string) {
  const ext = extensionOf(name)
  if (ext === 'pdf') return 'mdi-file-pdf-box'
  if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext)) return 'mdi-file-image'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'mdi-file-excel'
  if (['doc', 'docx'].includes(ext)) return 'mdi-file-word'
  return 'mdi-file-outline'
}
