import type { Attachment as AttachmentData } from '@aptoph/shared'
import type Attachment from '#models/files/attachment'

export function serializeAttachment(attachment: Attachment): AttachmentData {
  const uploadedBy = attachment.$preloaded.uploadedBy as unknown as
    { fullName: string | null } | undefined
  return {
    id: attachment.id,
    ownerType: attachment.ownerType,
    ownerId: attachment.ownerId,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: Number(attachment.sizeBytes),
    uploadedBy: uploadedBy?.fullName ?? null,
    createdAt: attachment.createdAt.toISO()!,
  }
}
