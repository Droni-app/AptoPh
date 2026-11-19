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
] as const

export type AttachmentOwnerType = (typeof ATTACHMENT_OWNER_TYPES)[number]

/** Tamaño máximo de un archivo */
export const ATTACHMENT_MAX_MB = 10
export const ATTACHMENT_MAX_BYTES = ATTACHMENT_MAX_MB * 1024 * 1024

/** Archivos activos por registro */
export const ATTACHMENT_MAX_PER_OWNER = 20

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
