import vine from '@vinejs/vine'
import { ENROLLMENT_ROLES } from '@aptoph/shared'

const dates = () => ({
  startsOn: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .nullable()
    .optional(),
  endsOn: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .afterOrSameAs('startsOn')
    .nullable()
    .optional(),
})

export const inviteMemberValidator = vine.create({
  email: vine.string().trim().toLowerCase().email().maxLength(254),
  fullName: vine.string().trim().minLength(3).maxLength(150),
  role: vine.enum(ENROLLMENT_ROLES),
  title: vine.string().trim().maxLength(100).nullable().optional(),
  occupantId: vine.string().uuid().nullable().optional(),
  ...dates(),
})

export const updateMemberValidator = vine.create({
  title: vine.string().trim().maxLength(100).nullable().optional(),
  ...dates(),
})

export const changeMemberStatusValidator = vine.create({
  status: vine.enum(['active', 'suspended', 'revoked'] as const),
})
