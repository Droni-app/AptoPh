import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Vehicle from '#models/vehicle'
import type Tenant from '#models/tenant'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import { findOwnUnit, residentUnitIds } from '#services/resident_scope'
import { presentVehicle } from '#transformers/resident'
import { createVehicleValidator, updateVehicleValidator } from '#validators/resident'

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

    const vehicle = await Vehicle.create({ ...data, tenantId: tenant.id, unitId: params.unitId })
    response.status(201)
    return { data: presentVehicle(vehicle) }
  }

  async update(ctx: HttpContext) {
    const vehicle = await this.find(ctx)
    const data = await ctx.request.validateUsing(updateVehicleValidator)
    if (data.plate && data.plate !== vehicle.plate) {
      await this.assertPlateIsFree(ctx.tenant, data.plate, vehicle.id)
    }
    vehicle.merge(data)
    await vehicle.save()
    return { data: presentVehicle(vehicle) }
  }

  async destroy(ctx: HttpContext) {
    const vehicle = await this.find(ctx)
    vehicle.deletedAt = DateTime.now()
    await vehicle.save()
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
