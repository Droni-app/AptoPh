import type { HttpContext } from '@adonisjs/core/http'
import { randomInt } from 'node:crypto'
import { DateTime } from 'luxon'
import Visit from '#models/gatehouse/visit'
import type Tenant from '#models/tenants/tenant'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import { findOwnUnit, residentUnitIds } from '#services/resident_scope'
import { presentVisit } from '#transformers/gatehouse/resident'
import { createVisitValidator } from '#validators/gatehouse/resident'

/** Visits can be authorized up to this many days ahead */
const MAX_DAYS_AHEAD = 60
/** History shown to the resident */
const HISTORY_DAYS = 30
/** No 0/O/1/I, easy to dictate at the gate */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Visitors authorized by the resident; the gate checks them in with the code.
 *   GET    /api/v1/resident/visits
 *   POST   /api/v1/resident/visits
 *   DELETE /api/v1/resident/visits/:id   (only before the visitor arrives)
 */
export default class VisitsController {
  async index({ tenant, auth }: HttpContext) {
    const unitIds = await residentUnitIds(tenant, auth.getUserOrFail().id)
    const since = DateTime.now().minus({ days: HISTORY_DAYS })

    const visits = await Visit.query()
      .where('tenant_id', tenant.id)
      .whereIn('unit_id', unitIds)
      .where((q) =>
        q
          .where('expected_at', '>=', since.toSQL()!)
          .orWhere('checked_in_at', '>=', since.toSQL()!)
          // Still inside, however long ago they arrived
          .orWhere((inside) => inside.whereNotNull('checked_in_at').whereNull('checked_out_at'))
      )
      .preload('unit', (unit) => unit.preload('building'))
      .orderByRaw('coalesce(expected_at, checked_in_at, created_at) desc')
      .limit(100)

    const now = DateTime.now()
    return { data: visits.map((visit) => presentVisit(visit, now)) }
  }

  async store({ tenant, auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(createVisitValidator)
    await findOwnUnit(tenant, user.id, data.unitId)

    const expectedAt = DateTime.fromISO(data.expectedAt, { setZone: true })
    const now = DateTime.now()
    if (!expectedAt.isValid || expectedAt < now.minus({ hours: 1 })) {
      throw new FieldException('expectedAt', 'La fecha de la visita debe ser futura')
    }
    if (expectedAt > now.plus({ days: MAX_DAYS_AHEAD })) {
      throw new FieldException(
        'expectedAt',
        `Puedes autorizar visitas hasta con ${MAX_DAYS_AHEAD} días de anticipación`
      )
    }

    const visit = await Visit.create({
      tenantId: tenant.id,
      unitId: data.unitId,
      visitorName: data.visitorName,
      visitorDocument: data.visitorDocument ?? null,
      vehiclePlate: data.vehiclePlate ?? null,
      type: data.type,
      expectedAt,
      accessCode: await this.uniqueCode(tenant),
      authorizedById: user.id,
    })
    await visit.load('unit', (unit) => unit.preload('building'))
    response.status(201)
    return { data: presentVisit(visit, now) }
  }

  async destroy({ tenant, auth, params, response }: HttpContext) {
    const unitIds = await residentUnitIds(tenant, auth.getUserOrFail().id)
    const visit = await Visit.query()
      .where('tenant_id', tenant.id)
      .where('id', params.id)
      .whereIn('unit_id', unitIds)
      .first()
    if (!visit) throw ResourceException.notFound('La visita no existe')
    if (visit.checkedInAt) {
      throw ResourceException.conflict('No puedes cancelar una visita que ya ingresó')
    }
    await visit.delete()
    return response.noContent()
  }

  /** Codes are unique among the conjunto's visits still open (see the partial index) */
  private async uniqueCode(tenant: Tenant) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = Array.from(
        { length: 6 },
        () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
      ).join('')
      const taken = await Visit.query()
        .where('tenant_id', tenant.id)
        .where('access_code', code)
        .whereNull('checked_out_at')
        .first()
      if (!taken) return code
    }
    throw new Error('Could not generate a unique access code')
  }
}
