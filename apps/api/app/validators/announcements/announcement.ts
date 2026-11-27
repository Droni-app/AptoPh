import vine from '@vinejs/vine'
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_STATUSES,
  ANNOUNCEMENT_TITLE_MAX,
} from '@aptoph/shared'

export const announcementValidator = vine.create({
  title: vine.string().trim().minLength(3).maxLength(ANNOUNCEMENT_TITLE_MAX),
  body: vine.string().trim().minLength(1).maxLength(ANNOUNCEMENT_BODY_MAX),
  audience: vine.enum(ANNOUNCEMENT_AUDIENCES),
  buildingIds: vine.array(vine.string().uuid()).maxLength(200).optional(),
  isPinned: vine.boolean().optional(),
  sendEmail: vine.boolean().optional(),
  publish: vine.enum(['draft', 'now', 'schedule'] as const),
  publishAt: vine.string().maxLength(40).nullable().optional(),
})

export const listAnnouncementsValidator = vine.create({
  status: vine.enum(ANNOUNCEMENT_STATUSES).optional(),
  search: vine.string().trim().maxLength(100).optional(),
  page: vine.number().min(1).optional(),
  perPage: vine.number().min(1).max(100).optional(),
})

/** Who an email would reach and whether the month's quota covers it */
export const emailPreviewValidator = vine.create({
  audience: vine.enum(ANNOUNCEMENT_AUDIENCES),
  buildingIds: vine.array(vine.string().uuid()).maxLength(200).optional(),
  publishAt: vine.string().maxLength(40).nullable().optional(),
})
