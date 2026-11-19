import vine from '@vinejs/vine'
import { EMAIL_PACKS_MAX_PER_REQUEST } from '@aptoph/shared'

export const emailPacksRequestValidator = vine.create({
  packs: vine.number().withoutDecimals().min(1).max(EMAIL_PACKS_MAX_PER_REQUEST),
})
