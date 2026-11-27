import vine from '@vinejs/vine'

/** Free-text label of the app or device that holds the token (shown in token lists) */
export const deviceField = vine.string().trim().maxLength(100).optional()

export const loginValidator = vine.create({
  email: vine.string().trim().toLowerCase().email().maxLength(254),
  password: vine.string().maxLength(128),
  device: deviceField,
})
