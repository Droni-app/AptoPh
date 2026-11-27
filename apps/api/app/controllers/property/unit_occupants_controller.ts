import type { HttpContext } from '@adonisjs/core/http'
import UnitOccupantTransformer from '#transformers/property/unit_occupant_transformer'
import {
  createUnitOccupantValidator,
  updateUnitOccupantValidator,
} from '#validators/property/unit_occupant'

/**
 * /api/v1/units/:unitId/occupants
 */
export default class UnitOccupantsController {
  private async findUnit({ tenant, params }: HttpContext) {
    return tenant
      .related('units')
      .query()
      .where('id', params.unitId)
      .whereNull('deleted_at')
      .firstOrFail()
  }

  async index(ctx: HttpContext) {
    const unit = await this.findUnit(ctx)
    const occupants = await unit
      .related('occupants')
      .query()
      .orderBy('is_primary_contact', 'desc')
      .orderBy('full_name')
    return ctx.serialize(UnitOccupantTransformer.transform(occupants))
  }

  async store(ctx: HttpContext) {
    const unit = await this.findUnit(ctx)
    const data = await ctx.request.validateUsing(createUnitOccupantValidator)
    const occupant = await unit.related('occupants').create({ ...data, tenantId: ctx.tenant.id })
    ctx.response.status(201)
    return ctx.serialize(UnitOccupantTransformer.transform(occupant))
  }

  async update(ctx: HttpContext) {
    const unit = await this.findUnit(ctx)
    const occupant = await unit
      .related('occupants')
      .query()
      .where('id', ctx.params.id)
      .firstOrFail()
    occupant.merge(await ctx.request.validateUsing(updateUnitOccupantValidator))
    await occupant.save()
    return ctx.serialize(UnitOccupantTransformer.transform(occupant))
  }

  async destroy(ctx: HttpContext) {
    const unit = await this.findUnit(ctx)
    const occupant = await unit
      .related('occupants')
      .query()
      .where('id', ctx.params.id)
      .firstOrFail()
    await occupant.delete()
    return ctx.response.noContent()
  }
}
