import {
  attachmentIcon,
  attachmentProblem,
  formatFileSize,
  type AttachmentOwnerType,
} from '@aptoph/shared'
import type { ApiItem, Attachment } from '@aptoph/shared'
import { announcementsApi } from '@/api/announcements'
import { financeApi } from '@/api/finance'
import { ticketsApi } from '@/api/tickets'
import { errorMessage } from '@/lib/errors'

/** The endpoints that manage the attachments of each kind of record */
export function attachmentsApiFor(ownerType: AttachmentOwnerType) {
  if (ownerType === 'announcement') {
    return {
      list: (ownerId: string) => announcementsApi.attachments(ownerId),
      upload: (ownerId: string, file: File): Promise<ApiItem<Attachment>> =>
        announcementsApi.uploadAttachment(ownerId, file),
      url: announcementsApi.attachmentUrl,
      remove: announcementsApi.removeAttachment,
    }
  }
  if (ownerType === 'ticket') {
    return {
      list: (ownerId: string) => ticketsApi.attachments(ownerId),
      upload: (ownerId: string, file: File): Promise<ApiItem<Attachment>> =>
        ticketsApi.uploadAttachment(ownerId, file),
      url: ticketsApi.attachmentUrl,
      remove: ticketsApi.removeAttachment,
    }
  }
  return {
    list: (ownerId: string) => financeApi.attachments(ownerType, ownerId),
    upload: (ownerId: string, file: File) => financeApi.uploadAttachment(ownerType, ownerId, file),
    url: financeApi.attachmentUrl,
    remove: financeApi.removeAttachment,
  }
}

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
  const endpoints = attachmentsApiFor(ownerType)
  for (const file of files) {
    try {
      await endpoints.upload(ownerId, file)
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
export async function openAttachment(ownerType: AttachmentOwnerType, id: string) {
  const tab = window.open('', '_blank')
  try {
    const { url } = (await attachmentsApiFor(ownerType).url(id)).data
    if (tab) tab.location.href = url
    else window.location.href = url
  } catch (e) {
    tab?.close()
    throw e
  }
}

export async function downloadAttachment(ownerType: AttachmentOwnerType, id: string) {
  const { url } = (await attachmentsApiFor(ownerType).url(id, true)).data
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
