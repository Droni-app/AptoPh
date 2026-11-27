import vine from '@vinejs/vine'
import {
  ANNOUNCEMENT_IMAGE_EXTENSIONS,
  ANNOUNCEMENT_IMAGE_MAX_MB,
  ATTACHMENT_EXTENSIONS,
  ATTACHMENT_MAX_MB,
  FINANCE_ATTACHMENT_OWNER_TYPES,
} from '@aptoph/shared'

/** Owner of a finance attachment (route params) */
export const attachmentOwnerValidator = vine.create({
  ownerType: vine.enum(FINANCE_ATTACHMENT_OWNER_TYPES),
  ownerId: vine.string().uuid(),
})

export const uploadAttachmentValidator = vine.create({
  file: vine.file({ size: `${ATTACHMENT_MAX_MB}mb`, extnames: [...ATTACHMENT_EXTENSIONS] }),
})

export const attachmentUrlValidator = vine.create({
  download: vine.boolean().optional(),
})

/** Image (poster) of a comunicado: formats every browser and email client shows */
export const uploadAnnouncementImageValidator = vine.create({
  file: vine.file({
    size: `${ANNOUNCEMENT_IMAGE_MAX_MB}mb`,
    extnames: [...ANNOUNCEMENT_IMAGE_EXTENSIONS],
  }),
})
