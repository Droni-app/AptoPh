import vine from '@vinejs/vine'
import { deviceField } from '#validators/auth/auth'

export const googleStartValidator = vine.create({
  app: vine.enum(['backoffice', 'web'] as const),
  intent: vine.enum(['login', 'signup'] as const).optional(),
})

export const googleCallbackValidator = vine.create({
  code: vine.string().maxLength(2048),
  state: vine.string().maxLength(4096),
  device: deviceField,
})

export const googleTokenValidator = vine.create({
  idToken: vine.string().maxLength(4096),
  device: deviceField,
})
