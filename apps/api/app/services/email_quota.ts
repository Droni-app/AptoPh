import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { EMAIL_MONTHLY_INCLUDED, EMAIL_PACK_SIZE, type EmailQuota } from '@aptoph/shared'
import type Tenant from '#models/tenant'

type QuotaRow = {
  period: string | Date
  used: number
  extra_packs: number
  requested_packs: number
  requested_at: Date | null
}

const LIMIT_SQL = `${EMAIL_MONTHLY_INCLUDED} + extra_packs * ${EMAIL_PACK_SIZE}`

/** First day of the calendar month of `at`, in the conjunto's time zone (yyyy-mm-01) */
export function quotaPeriod(tenant: Tenant, at: DateTime = DateTime.now()) {
  return at.setZone(tenant.timezone).startOf('month').toISODate()!
}

/**
 * Monthly bulk email quota of a conjunto (docs/email-quota.md).
 * 3,000 emails per calendar month plus the additional packs activated for that month.
 */
export class EmailQuotaService {
  constructor(private tenant: Tenant) {}

  /** Quota of the month that contains `at` (now by default) */
  async of(at?: DateTime): Promise<EmailQuota> {
    const period = quotaPeriod(this.tenant, at)
    const row = (await db
      .from('email_quotas')
      .where('tenant_id', this.tenant.id)
      .where('period', period)
      .first()) as QuotaRow | null
    const used = row?.used ?? 0
    const extraPacks = row?.extra_packs ?? 0
    const limit = EMAIL_MONTHLY_INCLUDED + extraPacks * EMAIL_PACK_SIZE
    return {
      period: period.slice(0, 7),
      included: EMAIL_MONTHLY_INCLUDED,
      extraPacks,
      limit,
      used,
      available: Math.max(0, limit - used),
      requestedPacks: row?.requested_packs ?? 0,
      requestedAt: row?.requested_at ? new Date(row.requested_at).toISOString() : null,
    }
  }

  /**
   * Takes `count` emails from the month's quota, all or nothing. Atomic: two
   * sends at once never go over the limit. Returns whether there was room.
   */
  async reserve(count: number, at?: DateTime, trx?: TransactionClientContract) {
    if (count <= 0) return true
    const client = trx ?? db
    const period = quotaPeriod(this.tenant, at)
    await this.ensureRow(period, client)
    const result = await client.rawQuery(
      `UPDATE email_quotas SET used = used + ?, updated_at = now()
       WHERE tenant_id = ? AND period = ? AND used + ? <= ${LIMIT_SQL}
       RETURNING used`,
      [count, this.tenant.id, period, count]
    )
    return result.rows.length > 0
  }

  /** Records a request for additional packs for the current month (activated by AptoPH) */
  async request(packs: number, userId: string) {
    const period = quotaPeriod(this.tenant)
    await this.ensureRow(period)
    await db
      .from('email_quotas')
      .where('tenant_id', this.tenant.id)
      .where('period', period)
      .update({
        requested_packs: db.raw('requested_packs + ?', [packs]),
        requested_at: new Date(),
        requested_by_id: userId,
        updated_at: new Date(),
      })
    return this.of()
  }

  /** Activates paid packs for a month (yyyy-mm-01) and settles the pending request */
  async addPacks(packs: number, period = quotaPeriod(this.tenant)) {
    await this.ensureRow(period)
    await db
      .from('email_quotas')
      .where('tenant_id', this.tenant.id)
      .where('period', period)
      .update({
        extra_packs: db.raw('extra_packs + ?', [packs]),
        requested_packs: db.raw('greatest(requested_packs - ?, 0)', [packs]),
        updated_at: new Date(),
      })
    return this.of(DateTime.fromISO(period, { zone: this.tenant.timezone }))
  }

  private async ensureRow(period: string, client: TransactionClientContract | typeof db = db) {
    await client
      .table('email_quotas')
      .insert({ tenant_id: this.tenant.id, period })
      .onConflict(['tenant_id', 'period'])
      .ignore()
  }
}
