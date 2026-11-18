import vine from '@vinejs/vine'
import { DOCUMENT_TYPES } from '@aptoph/shared'
import { deviceField } from '#validators/auth'

/** Same rule everywhere a password is chosen */
export const newPassword = () => vine.string().minLength(8).maxLength(128)

/** Which web app sent the request: the email links back to it */
const appField = vine.enum(['backoffice', 'web'] as const).optional()

const tokenField = () => vine.string().trim().minLength(20).maxLength(200)

export const forgotPasswordValidator = vine.create({
  email: vine.string().trim().toLowerCase().email().maxLength(254),
  app: appField,
})

export const resetPasswordValidator = vine.create({
  token: tokenField(),
  password: newPassword(),
  device: deviceField,
})

export const verifyEmailValidator = vine.create({
  token: tokenField(),
})

export const sendVerificationValidator = vine.create({
  app: appField,
})

export const acceptInvitationValidator = vine.create({
  token: tokenField(),
  fullName: vine.string().trim().minLength(3).maxLength(150).optional(),
  password: newPassword().optional(),
  device: deviceField,
})

export const updateProfileValidator = vine.create({
  fullName: vine.string().trim().minLength(3).maxLength(150),
  phone: vine
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/)
    .maxLength(30)
    .nullable(),
  documentType: vine.enum(DOCUMENT_TYPES).nullable(),
  documentNumber: vine.string().trim().maxLength(30).nullable(),
})

export const changePasswordValidator = vine.create({
  currentPassword: vine.string().maxLength(128),
  password: newPassword().notSameAs('currentPassword'),
})
