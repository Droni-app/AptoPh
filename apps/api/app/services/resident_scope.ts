import db from '@adonisjs/lucid/services/db'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'
import type Tenant from '#models/tenant'
import type UnitOccupant from '#models/unit_occupant'

/** Today's date in the tenant's timezone (occupancy and due dates are local dates) */
export function tenantToday(tenant: Tenant) {
  return DateTime.now().setZone(tenant.timezone).toISODate()!
}

/**
 * Occupancies valid on `today`: started (or no start date) and not ended.
 * Use as a grouped condition: `query.where(activeOccupancy(today))`
 */
export function activeOccupancy(today: string) {
  return (query: ModelQueryBuilderContract<typeof UnitOccupant>) => {
    query
      .where((q) => q.whereNull('starts_on').orWhere('starts_on', '<=', today))
      .where((q) => q.whereNull('ends_on').orWhere('ends_on', '>=', today))
  }
}

export type UnitBalance = { pending: string; overdue: string; openCharges: number }

const ZERO_BALANCE: UnitBalance = { pending: '0.00', overdue: '0.00', openCharges: 0 }

/**
 * Outstanding balance per unit: open charges (pending / partially paid) and the
 * part of it already past its due date. Amounts are strings to keep precision.
 */
export async function balancesFor(tenant: Tenant, unitIds: string[], today: string) {
  const balances = new Map<string, UnitBalance>()
  for (const id of unitIds) balances.set(id, { ...ZERO_BALANCE })
  if (unitIds.length === 0) return balances

  const rows = await db
    .from('charges')
    .where('tenant_id', tenant.id)
    .whereIn('unit_id', unitIds)
    .whereIn('status', ['pending', 'partially_paid'])
    .groupBy('unit_id')
    .select('unit_id')
    .select(db.raw('coalesce(sum(balance), 0)::numeric(14,2)::text as pending'))
    .select(
      db.raw(
        'coalesce(sum(balance) filter (where due_on < ?), 0)::numeric(14,2)::text as overdue',
        [today]
      )
    )
    .count('* as open_charges')

  for (const row of rows) {
    balances.set(row.unit_id, {
      pending: row.pending,
      overdue: row.overdue,
      openCharges: Number(row.open_charges),
    })
  }
  return balances
}
