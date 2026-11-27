import vine from '@vinejs/vine'
import { EMAIL_PACKS_MAX_PER_REQUEST, PAYMENT_METHOD_TYPES } from '@aptoph/shared'

const phone = () =>
  vine
    .string()
    .trim()
    .regex(/^3\d{9}$/)

export const paymentMethodValidator = vine.create({
  type: vine.enum(PAYMENT_METHOD_TYPES),
  token: vine.string().trim().minLength(4).maxLength(200),
  acceptanceToken: vine.string().trim().minLength(10).maxLength(4000),
  personalAuthToken: vine.string().trim().minLength(10).maxLength(4000),
  expMonth: vine.number().withoutDecimals().range([1, 12]).optional(),
  expYear: vine.number().withoutDecimals().range([0, 99]).optional(),
})

export const nequiTokenValidator = vine.create({ phoneNumber: phone() })

export const daviplataTokenValidator = vine.create({
  documentType: vine.enum(['CC', 'CE', 'TI', 'PP', 'NIT'] as const),
  documentNumber: vine
    .string()
    .trim()
    .regex(/^\d{5,15}$/),
  phoneNumber: phone(),
})

export const daviplataOtpValidator = vine.create({
  handle: vine.string().maxLength(6000),
  /** Without code: send it again */
  code: vine
    .string()
    .trim()
    .regex(/^\d{6}$/)
    .optional(),
})

export const autoRenewValidator = vine.create({ enabled: vine.boolean() })

export const emailPacksValidator = vine.create({
  packs: vine.number().withoutDecimals().min(1).max(EMAIL_PACKS_MAX_PER_REQUEST),
})
