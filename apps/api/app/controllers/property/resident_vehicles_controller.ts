import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Vehicle from '#models/property/vehicle'
import type Tenant from '#models/tenants/tenant'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import { findOwnUnit, residentUnitIds } from '#services/resident_scope'
import { presentVehicle } from '#transformers/property/resident'
import { createVehicleValidator, updateVehicleValidator } from '#validators/property/resident'
import { parkingSettings } from '@aptoph/shared'
import db from '@adonisjs/lucid/services/db'

type VehicleInput = Awaited<ReturnType<typeof createVehicleValidator.validate>>

/**
 * Owner and document fields as stored: a resident's own vehicle has no owner
 * data; someone else's needs the name, and only if the conjunto allows it.
 */
function ownerFields(tenant: Tenant, data: Partial<VehicleInput>, current?: Vehicle) {
  const { soatExpiresOn, inspectionExpiresOn, ...rest } = data
  const fields: Partial<Vehicle> = {}
  const dates = { soatExpiresOn, inspectionExpiresOn }
  for (const [key, value] of Object.entries(dates)) {
    if (value !== undefined) {
      ;(fields as Record<string, unknown>)[key] = value ? DateTime.fromISO(value) : null
    }
  }
  const ownerType = rest.ownerType ?? current?.ownerType ?? 'resident'
  if (ownerType === 'resident') {
    return {
      ...rest,
      ...fields,
      ownerType,
      ownerName: null,
      ownerDocumentType: null,
      ownerDocumentNumber: null,
      ownerRelationship: null,
      ownerPhone: null,
    }
  }
  const allowed = parkingSettings((tenant.settings ?? {}).parking).allowThirdPartyVehicles
  if (!allowed && current?.ownerType !== 'third_party') {
    throw new FieldException(
      'ownerType',
      'El conjunto no permite registrar vehículos a nombre de terceros'
    )
  }
  const ownerName = rest.ownerName === undefined ? current?.ownerName : rest.ownerName
  if (!ownerName?.trim()) {
    throw new FieldException('ownerName', 'Escribe el nombre del propietario del vehículo')
  }
  return { ...rest, ...fields, ownerType }
}

/**
 * Vehicles of the resident's units:
 *   POST   /api/v1/resident/units/:unitId/vehicles
 *   PATCH  /api/v1/resident/vehicles/:id
 *   DELETE /api/v1/resident/vehicles/:id   (soft delete)
 */
export default class VehiclesController {
  async store({ tenant, auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    await findOwnUnit(tenant, user.id, params.unitId)
    const data = await request.validateUsing(createVehicleValidator)
    await this.assertPlateIsFree(tenant, data.plate)

    const vehicle = await Vehicle.create({
      ...ownerFields(tenant, data),
      tenantId: tenant.id,
      unitId: params.unitId,
    })
    response.status(201)
    return { data: presentVehicle(vehicle) }
  }

  async update(ctx: HttpContext) {
    const vehicle = await this.find(ctx)
    const data = await ctx.request.validateUsing(updateVehicleValidator)
    if (data.plate && data.plate !== vehicle.plate) {
      await this.assertPlateIsFree(ctx.tenant, data.plate, vehicle.id)
    }
    vehicle.merge(ownerFields(ctx.tenant, data, vehicle))
    await vehicle.save()
    return { data: presentVehicle(vehicle) }
  }

  async destroy(ctx: HttpContext) {
    const vehicle = await this.find(ctx)
    vehicle.deletedAt = DateTime.now()
    await db.transaction(async (trx) => {
      await vehicle.useTransaction(trx).save()
      // The spot stays with the unit, without this vehicle
      await trx
        .from('parking_assignments')
        .where('tenant_id', ctx.tenant.id)
        .where('vehicle_id', vehicle.id)
        .whereIn('status', ['offered', 'active'])
        .update({ vehicle_id: null, updated_at: new Date() })
    })
    return ctx.response.noContent()
  }

  private async find({ tenant, auth, params }: HttpContext) {
    const unitIds = await residentUnitIds(tenant, auth.getUserOrFail().id)
    const vehicle = await Vehicle.query()
      .where('tenant_id', tenant.id)
      .where('id', params.id)
      .whereIn('unit_id', unitIds)
      .whereNull('deleted_at')
      .first()
    if (!vehicle) throw ResourceException.notFound('El vehículo no existe')
    return vehicle
  }

  /** Plates are unique among the conjunto's active vehicles */
  private async assertPlateIsFree(tenant: Tenant, plate: string, exceptId?: string) {
    const taken = await Vehicle.query()
      .where('tenant_id', tenant.id)
      .where('plate', plate)
      .whereNull('deleted_at')
      .if(exceptId, (query) => query.whereNot('id', exceptId!))
      .first()
    if (taken) {
      throw new FieldException('plate', 'Esta placa ya está registrada en el conjunto')
    }
  }
}
