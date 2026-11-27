import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import UnitOccupant from '#models/property/unit_occupant'
import ResourceException from '#exceptions/resource_exception'
import {
  activeOccupancy,
  canManageHousehold,
  findOwnUnit,
  residentOccupancies,
  tenantToday,
} from '#services/resident_scope'
import { isResidentManaged, presentHouseholdMember } from '#transformers/property/resident'
import {
  createHouseholdMemberValidator,
  updateHouseholdMemberValidator,
} from '#validators/property/resident'

/**
 * Household members residents manage themselves: family members, domestic
 * workers and others without an account. Owners, renters and billing roles are
 * registered by the administration. Only owners, renters or the unit's primary
 * contact may change the household.
 *
 *   POST   /api/v1/resident/units/:unitId/household
 *   PATCH  /api/v1/resident/household/:id
 *   DELETE /api/v1/resident/household/:id   (ends the occupancy)
 */
export default class HouseholdController {
  async store({ tenant, auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const occupancy = await findOwnUnit(tenant, user.id, params.unitId)
    if (!canManageHousehold(occupancy)) throw this.forbidden()

    const data = await request.validateUsing(createHouseholdMemberValidator)
    const member = await UnitOccupant.create({
      ...data,
      tenantId: tenant.id,
      unitId: params.unitId,
      startsOn: DateTime.fromISO(tenantToday(tenant)),
    })
    response.status(201)
    return { data: presentHouseholdMember(member, user.id, true) }
  }

  async update(ctx: HttpContext) {
    const member = await this.find(ctx)
    member.merge(await ctx.request.validateUsing(updateHouseholdMemberValidator))
    await member.save()
    return { data: presentHouseholdMember(member, ctx.auth.getUserOrFail().id, true) }
  }

  /**
   * Ends the occupancy yesterday so it leaves the household today but stays in
   * the unit's history; a member added today is simply removed.
   */
  async destroy(ctx: HttpContext) {
    const member = await this.find(ctx)
    const today = DateTime.fromISO(tenantToday(ctx.tenant))
    if (!member.startsOn || member.startsOn < today) {
      member.endsOn = today.minus({ days: 1 })
      await member.save()
    } else {
      await member.delete()
    }
    return ctx.response.noContent()
  }

  private async find({ tenant, auth, params }: HttpContext) {
    const occupancies = await residentOccupancies(tenant, auth.getUserOrFail().id)
    const member = await UnitOccupant.query()
      .where('tenant_id', tenant.id)
      .where('id', params.id)
      .whereIn(
        'unit_id',
        occupancies.map((o) => o.unitId)
      )
      .where(activeOccupancy(tenantToday(tenant)))
      .first()
    if (!member) throw ResourceException.notFound('La persona no existe')

    const occupancy = occupancies.find((o) => o.unitId === member.unitId)!
    if (!canManageHousehold(occupancy)) throw this.forbidden()
    if (!isResidentManaged(member)) {
      throw ResourceException.forbidden('Esta persona la gestiona la administración del conjunto')
    }
    return member
  }

  private forbidden() {
    return ResourceException.forbidden(
      'Solo el propietario, el arrendatario o el contacto principal pueden modificar el hogar'
    )
  }
}
