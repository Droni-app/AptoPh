import vine from '@vinejs/vine'
import { BILLING_CYCLES } from '@aptoph/shared'
import { SELF_SERVE_PLAN_IDS } from '#validators/signup'

export const activationRequestValidator = vine.create({
  plan: vine.enum(SELF_SERVE_PLAN_IDS),
  billingCycle: vine.enum(BILLING_CYCLES),
})
