import vine from '@vinejs/vine'
import { PLAN_IDS } from '@aptoph/shared'
import { deviceField } from '#validators/auth/auth'

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
  /** There is a single plan; accepted for older clients that still send it */
  plan: vine.enum(PLAN_IDS).optional(),
  acceptTerms: vine.accepted(),
  device: deviceField,
})
