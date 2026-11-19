import {
  ATTACHMENT_EXTENSIONS,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_MB,
  type AttachmentOwnerType,
} from '@aptoph/shared'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'

const allowed = new Set<string>(ATTACHMENT_EXTENSIONS)

function extensionOf(name: string) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

/** Why a file cannot be attached, or null when it can */
export function fileProblem(file: File): string | null {
  if (!allowed.has(extensionOf(file.name)))
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

/** Material Design Icon for a file */
export function fileIcon(name: string) {
  const ext = extensionOf(name)
  if (ext === 'pdf') return 'mdi-file-pdf-box'
  if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext)) return 'mdi-file-image'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'mdi-file-excel'
  if (['doc', 'docx'].includes(ext)) return 'mdi-file-word'
  return 'mdi-file-outline'
}

/**
 * Uploads the files picked in a form once its record exists. Returns the
 * messages of the files that could not be uploaded (the record is saved anyway).
 */
export async function uploadAttachments(
  ownerType: AttachmentOwnerType,
  ownerId: string,
  files: File[],
) {
  const failed: string[] = []
  for (const file of files) {
    try {
      await financeApi.uploadAttachment(ownerType, ownerId, file)
    } catch (e) {
      failed.push(`${file.name}: ${errorMessage(e)}`)
    }
  }
  return failed
}

/**
 * Opens an attachment in a new tab. The tab is opened before asking for the
 * signed link so the browser does not block it as a pop-up.
 */
export async function openAttachment(id: string) {
  const tab = window.open('', '_blank')
  try {
    const { url } = (await financeApi.attachmentUrl(id)).data
    if (tab) tab.location.href = url
    else window.location.href = url
  } catch (e) {
    tab?.close()
    throw e
  }
}

export async function downloadAttachment(id: string) {
  const { url } = (await financeApi.attachmentUrl(id, true)).data
  const link = document.createElement('a')
  link.href = url
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/** Warns about the files that could not be uploaded after saving a record */
export function warnFailedUploads(
  toast: { warning: (message: string, options?: { duration?: number }) => string },
  failed: string[],
) {
  if (!failed.length) return
  toast.warning(
    `Se guardó, pero no se pudo subir: ${failed.join(' · ')}. Adjúntalos desde el detalle.`,
    { duration: 10_000 },
  )
}
