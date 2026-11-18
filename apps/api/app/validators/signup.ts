import vine from '@vinejs/vine'
import { PLANS } from '@aptoph/shared'

/** Plans that can be started from the sign-up form (Empresarial goes through sales) */
export const SELF_SERVE_PLAN_IDS = PLANS.filter((plan) => plan.selfServe).map((plan) => plan.id)

export const signupValidator = vine.create({
  fullName: vine.string().trim().minLength(3).maxLength(150),
  email: vine.string().trim().toLowerCase().email().maxLength(254),
  phone: vine
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/)
    .maxLength(30),
  password: vine.string().minLength(8).maxLength(128),
  tenantName: vine.string().trim().minLength(3).maxLength(150),
  city: vine.string().trim().minLength(2).maxLength(100),
  units: vine.number().withoutDecimals().min(1).max(20_000),
  plan: vine.enum(SELF_SERVE_PLAN_IDS),
  acceptTerms: vine.accepted(),
})
