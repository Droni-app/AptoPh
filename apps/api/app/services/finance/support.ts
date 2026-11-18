import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { financeSettings, type FinanceSettings } from '@aptoph/shared'
import type Tenant from '#models/tenant'

export type Trx = TransactionClientContract

/**
 * Serializes the finance writes of a conjunto inside a transaction: billing,
 * payments and payables read balances and then update them.
 */
export async function lockFinance(trx: Trx, tenantId: string) {
  await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtext(?))', [`finance:${tenantId}`])
}

/**
 * Next consecutive number of a document type ("journal", "receipt",
 * "vendor_payment"). Gap-free: a rolled back transaction gives the number back.
 */
export async function nextNumber(trx: Trx, tenantId: string, key: string): Promise<number> {
  const result = await trx.rawQuery(
    `INSERT INTO document_sequences (tenant_id, key, next_value) VALUES (?, ?, 2)
     ON CONFLICT (tenant_id, key) DO UPDATE SET next_value = document_sequences.next_value + 1
     RETURNING next_value - 1 AS value`,
    [tenantId, key]
  )
  return Number(result.rows[0].value)
}

export function settingsOf(tenant: Tenant): FinanceSettings {
  return financeSettings((tenant.settings ?? {}).finance)
}

/** Today in the conjunto's time zone (ISO date) */
export function todayFor(tenant: Tenant) {
  return DateTime.now()
    .setZone(tenant.timezone || 'America/Bogota')
    .toISODate()!
}

/** ISO date of a Luxon date column */
export function iso(date: DateTime | null | undefined) {
  return date ? date.toISODate()! : null
}

export function transaction<T>(callback: (trx: Trx) => Promise<T>) {
  return db.transaction(callback)
}
