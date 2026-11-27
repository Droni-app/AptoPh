import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Parcel from '#models/gatehouse/parcel'
import { residentUnitIds } from '#services/resident_scope'
import { presentParcel } from '#transformers/gatehouse/resident'

/** Delivered parcels stay in the list this long */
const HISTORY_DAYS = 30

/**
 * GET /api/v1/resident/parcels — parcels received at the gate for the resident's
 * units: everything still waiting, plus the last month's deliveries.
 */
export default class ParcelsController {
  async index({ tenant, auth }: HttpContext) {
    const unitIds = await residentUnitIds(tenant, auth.getUserOrFail().id)
    const since = DateTime.now().minus({ days: HISTORY_DAYS }).toSQL()!

    const parcels = await Parcel.query()
      .where('tenant_id', tenant.id)
      .whereIn('unit_id', unitIds)
      .where((q) => q.where('status', 'pending').orWhere('received_at', '>=', since))
      .preload('unit', (unit) => unit.preload('building'))
      .orderByRaw("status = 'pending' desc")
      .orderBy('received_at', 'desc')
      .limit(100)

    return { data: parcels.map(presentParcel) }
  }
}
