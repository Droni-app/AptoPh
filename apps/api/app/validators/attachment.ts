import vine from '@vinejs/vine'
import { ATTACHMENT_EXTENSIONS, ATTACHMENT_MAX_MB, ATTACHMENT_OWNER_TYPES } from '@aptoph/shared'

export const attachmentOwnerValidator = vine.create({
  ownerType: vine.enum(ATTACHMENT_OWNER_TYPES),
  ownerId: vine.string().uuid(),
})

export const uploadAttachmentValidator = vine.create({
  file: vine.file({ size: `${ATTACHMENT_MAX_MB}mb`, extnames: [...ATTACHMENT_EXTENSIONS] }),
})

export const attachmentUrlValidator = vine.create({
  download: vine.boolean().optional(),
})
