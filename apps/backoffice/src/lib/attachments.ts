import {
  attachmentIcon,
  attachmentProblem,
  formatFileSize,
  type AttachmentOwnerType,
} from '@aptoph/shared'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'

/** Why a file cannot be attached, or null when it can */
export const fileProblem = (file: File) => attachmentProblem(file)
export { attachmentIcon as fileIcon, formatFileSize }

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
