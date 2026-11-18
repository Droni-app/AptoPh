import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { PROPERTY_TYPES } from '@aptoph/shared'
import type Tenant from '#models/tenant'

const updateTenantSettingsValidator = vine.create({
  name: vine.string().trim().minLength(3).maxLength(150),
  legalName: vine.string().trim().maxLength(200).nullable(),
  taxId: vine
    .string()
    .trim()
    .regex(/^[0-9.\- ]{5,30}$/)
    .nullable(),
  propertyType: vine.enum(PROPERTY_TYPES),
  address: vine.string().trim().maxLength(255).nullable(),
  city: vine.string().trim().minLength(2).maxLength(100),
})

function serialize(tenant: Tenant) {
  return {
    data: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      legalName: tenant.legalName,
      taxId: tenant.taxId,
      propertyType: tenant.propertyType,
      address: tenant.address,
      city: tenant.city,
      countryCode: tenant.countryCode,
      timezone: tenant.timezone,
      currency: tenant.currency,
    },
  }
}

/**
 * The conjunto's own data: /api/v1/settings/tenant. Every back-office role reads
 * it; only the administration changes it.
 */
export default class TenantSettingsController {
  async show({ tenant }: HttpContext) {
    return serialize(tenant)
  }

  async update({ tenant, request }: HttpContext) {
    tenant.merge(await request.validateUsing(updateTenantSettingsValidator))
    await tenant.save()
    return serialize(tenant)
  }
}
