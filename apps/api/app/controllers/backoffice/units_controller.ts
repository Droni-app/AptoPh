import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import FieldException from '#exceptions/field_exception'
import type Tenant from '#models/tenant'
import UnitTransformer from '#transformers/unit_transformer'
import { createUnitValidator, listUnitsValidator, updateUnitValidator } from '#validators/unit'

/**
 * Ensures referenced rows exist in the same tenant (the composite FKs would
 * reject them anyway, but this returns a clear field error).
 */
async function assertReferences(
  tenant: Tenant,
  data: { buildingId?: string | null; parentUnitId?: string | null },
  unitId?: string
) {
  if (data.buildingId) {
    const building = await tenant.related('buildings').query().where('id', data.buildingId).first()
    if (!building) throw new FieldException('buildingId', 'La torre seleccionada no existe')
  }
  if (data.parentUnitId) {
    if (data.parentUnitId === unitId) {
      throw new FieldException('parentUnitId', 'Una unidad no puede ser anexa de sí misma')
    }
    const parent = await tenant
      .related('units')
      .query()
      .where('id', data.parentUnitId)
      .whereNull('deleted_at')
      .first()
    if (!parent) throw new FieldException('parentUnitId', 'La unidad principal no existe')
  }
}

export default class UnitsController {
  async index({ tenant, request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listUnitsValidator, { data: request.qs() })

    const query = tenant
      .related('units')
      .query()
      .whereNull('deleted_at')
      .preload('building')
      .withCount('occupants')
      // building order first (units without building last), then natural code order
      .orderByRaw(
        '(select b.sort_order from buildings b where b.id = units.building_id) asc nulls last'
      )
      .orderByRaw('length(units.code), units.code')

    if (filters.buildingId) query.where('building_id', filters.buildingId)
    if (filters.type) query.where('type', filters.type)
    if (filters.status) query.where('status', filters.status)
    if (filters.search) query.whereILike('code', `%${filters.search}%`)

    const page = await query.paginate(filters.page ?? 1, filters.perPage ?? 25)
    return serialize(UnitTransformer.paginate(page.all(), page.getMeta()))
  }

  async store({ tenant, request, response, serialize }: HttpContext) {
    const data = await request.validateUsing(createUnitValidator)
    await assertReferences(tenant, data)

    const unit = await tenant
      .related('units')
      .create({ buildingId: null, parentUnitId: null, ...data })
    await unit.load('building')
    response.status(201)
    return serialize(UnitTransformer.transform(unit))
  }

  async show({ tenant, params, serialize }: HttpContext) {
    const unit = await tenant
      .related('units')
      .query()
      .where('id', params.id)
      .whereNull('deleted_at')
      .preload('building')
      .preload('occupants', (query) =>
        query.orderBy('is_primary_contact', 'desc').orderBy('full_name')
      )
      .firstOrFail()

    return serialize(UnitTransformer.transform(unit))
  }

  async update({ tenant, params, request, serialize }: HttpContext) {
    const unit = await tenant
      .related('units')
      .query()
      .where('id', params.id)
      .whereNull('deleted_at')
      .firstOrFail()

    const data = await request.validateUsing(updateUnitValidator)
    await assertReferences(tenant, data, unit.id)

    unit.merge(data)
    await unit.save()
    await unit.load('building')
    return serialize(UnitTransformer.transform(unit))
  }

  /**
   * Soft delete: the unit keeps its history (charges, payments…)
   */
  async destroy({ tenant, params, response }: HttpContext) {
    const unit = await tenant
      .related('units')
      .query()
      .where('id', params.id)
      .whereNull('deleted_at')
      .firstOrFail()

    unit.deletedAt = DateTime.now()
    await unit.save()
    return response.noContent()
  }
}
