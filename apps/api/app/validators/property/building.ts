import vine from '@vinejs/vine'

export const createBuildingValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(80),
  floors: vine.number().withoutDecimals().min(1).max(200).nullable().optional(),
  sortOrder: vine.number().withoutDecimals().min(0).max(1000).optional(),
})

export const updateBuildingValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(80).optional(),
  floors: vine.number().withoutDecimals().min(1).max(200).nullable().optional(),
  sortOrder: vine.number().withoutDecimals().min(0).max(1000).optional(),
})
