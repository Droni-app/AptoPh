import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import FieldException from '#exceptions/field_exception'
import type Tenant from '#models/tenant'
import { type FinanceScope, withFinance } from '#services/finance/scope'
import { todayFor } from '#services/finance/support'

/** Runs a finance write as the signed-in user */
export function finance<T>(ctx: HttpContext, callback: (scope: FinanceScope) => Promise<T>) {
  return withFinance(ctx.tenant, ctx.auth.getUserOrFail().id, callback)
}

/** "2026-11" | "2026-11-01" → "2026-11-01" */
export function normalizePeriod(value: string) {
  return `${value.slice(0, 7)}-01`
}

/** A payment date as a timestamp in the conjunto's zone (now when it is today) */
export function paidAtFrom(tenant: Tenant, paidOn: string) {
  const today = todayFor(tenant)
  if (paidOn > today) throw new FieldException('paidOn', 'La fecha de pago no puede ser futura')
  const zone = tenant.timezone || 'America/Bogota'
  return paidOn === today
    ? DateTime.now().setZone(zone)
    : DateTime.fromISO(`${paidOn}T12:00:00`, { zone })
}

/** First day of the year and today, unless given */
export function rangeOf(tenant: Tenant, input: { from?: string; to?: string }) {
  const today = todayFor(tenant)
  const to = input.to ?? today
  const from = input.from ?? `${to.slice(0, 4)}-01-01`
  if (from > to) throw new FieldException('from', 'La fecha inicial es posterior a la final')
  return { from, to }
}
