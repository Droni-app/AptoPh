import { DateTime } from 'luxon'
import {
  type ChargeSource,
  type JournalEntryType,
  fromCents,
  periodLabel,
  periodOf,
  toCents,
} from '@aptoph/shared'
import { Exception } from '@adonisjs/core/exceptions'
import FieldException from '#exceptions/field_exception'
import Charge from '#models/finance/charge'
import ChargeAdjustment from '#models/finance/charge_adjustment'
import ChargeConcept from '#models/finance/charge_concept'
import Unit from '#models/property/unit'
import type { FinanceScope } from '#services/finance/scope'
import type { PostingLine } from '#services/finance/ledger'
import { iso } from '#services/finance/support'

export type NewCharge = {
  unitId: string
  concept: ChargeConcept
  /** Cents */
  amount: number
  /** First day of the billed month */
  period: string
  dueOn: string
  description?: string | null
  sourceType: ChargeSource
  sourceId?: string | null
  idempotencyKey?: string | null
  billingPeriodId?: string | null
  recurringChargeId?: string | null
  discountUntil?: string | null
  /** Cents */
  discountAmount?: number
}

/** Status that matches a charge's balance */
export function statusFor(charge: Charge): Charge['status'] {
  if (charge.status === 'cancelled') return 'cancelled'
  const balance = toCents(charge.balance)
  if (balance === 0) return 'paid'
  return balance < toCents(charge.amount) ? 'partially_paid' : 'pending'
}

/** How a charge reads in statements and vouchers: "Cuota de administración · noviembre 2026" */
export function chargeLabel(charge: Charge, concept: ChargeConcept) {
  const base = `${concept.name} · ${periodLabel(iso(charge.period)!)}`
  return charge.description ? `${base} · ${charge.description}` : base
}

/**
 * Charges (cuentas por cobrar). Every module that bills a unit creates its
 * charges here: monthly billing, manual charges and, later, parking, visitor
 * parking and common area bookings.
 */
export class ChargeService {
  constructor(private scope: FinanceScope) {}

  /** Inserts charges without posting them (the caller posts once for all) */
  async insert(items: NewCharge[]) {
    if (items.length === 0) return []
    const { trx, tenant, userId } = this.scope
    const charges = await Charge.createMany(
      items.map((item) => ({
        tenantId: tenant.id,
        unitId: item.unitId,
        chargeConceptId: item.concept.id,
        period: DateTime.fromISO(item.period),
        description: item.description ?? null,
        amount: fromCents(item.amount),
        balance: fromCents(item.amount),
        dueOn: DateTime.fromISO(item.dueOn),
        status: 'pending' as const,
        sourceType: item.sourceType,
        sourceId: item.sourceId ?? null,
        idempotencyKey: item.idempotencyKey ?? null,
        billingPeriodId: item.billingPeriodId ?? null,
        recurringChargeId: item.recurringChargeId ?? null,
        discountUntil: item.discountUntil ? DateTime.fromISO(item.discountUntil) : null,
        discountAmount: fromCents(item.discountAmount ?? 0),
        createdById: userId,
      })),
      { client: trx }
    )
    charges.forEach((charge, i) => charge.$setRelated('chargeConcept', items[i]!.concept))
    return charges
  }

  /**
   * Accrual voucher: debit each unit's receivable, credit the income accounts
   * (grouped). Charges must have their concept loaded.
   */
  async post(
    charges: Charge[],
    voucher: {
      date: string
      type: JournalEntryType
      description: string
      sourceType?: string
      sourceId?: string
    }
  ) {
    if (charges.length === 0) return null
    const lines: PostingLine[] = []
    const income = new Map<string, number>()
    for (const charge of charges) {
      const concept = charge.chargeConcept
      const amount = toCents(charge.amount)
      lines.push({
        accountId: concept.receivableAccountId!,
        debit: amount,
        unitId: charge.unitId,
        description: chargeLabel(charge, concept),
      })
      income.set(concept.incomeAccountId!, (income.get(concept.incomeAccountId!) ?? 0) + amount)
    }
    for (const [accountId, amount] of income) {
      lines.push({ accountId, credit: amount, description: voucher.description })
    }
    return this.scope.ledger.post({ ...voucher, userId: this.scope.userId, lines })
  }

  /**
   * One charge, posted on its own and paid with the unit's credit if it has
   * any. The entry point for other modules (bookings, parking…): pass an
   * `idempotencyKey` and calling twice returns the existing charge.
   */
  async create(input: {
    unitId: string
    conceptCode?: string
    conceptId?: string
    amount: number
    dueOn: string
    period?: string
    description?: string | null
    sourceType?: ChargeSource
    sourceId?: string | null
    idempotencyKey?: string | null
  }) {
    const { trx, tenant } = this.scope
    if (input.idempotencyKey) {
      const existing = await Charge.query({ client: trx })
        .where('tenant_id', tenant.id)
        .where('idempotency_key', input.idempotencyKey)
        .preload('chargeConcept')
        .first()
      if (existing) return existing
    }
    const concept = await this.concept({ id: input.conceptId, code: input.conceptCode })
    const [charge] = await this.issue([input.unitId], {
      concept,
      amount: input.amount,
      dueOn: input.dueOn,
      period: input.period,
      description: input.description,
      sourceType: input.sourceType ?? 'manual',
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey,
    })
    return charge!
  }

  /** Manual charge to one or many units (fines, extraordinary fees, services…) */
  async issue(
    unitIds: string[],
    input: {
      concept: ChargeConcept
      amount: number
      dueOn: string
      period?: string
      description?: string | null
      sourceType?: ChargeSource
      sourceId?: string | null
      idempotencyKey?: string | null
    }
  ) {
    const { trx, tenant } = this.scope
    if (!input.concept.isActive) throw new FieldException('conceptId', 'El concepto está inactivo')
    if (input.amount <= 0) throw new FieldException('amount', 'El valor debe ser mayor que cero')
    const units = await Unit.query({ client: trx })
      .where('tenant_id', tenant.id)
      .whereIn('id', unitIds)
      .whereNull('deleted_at')
    if (units.length !== new Set(unitIds).size) {
      throw new FieldException('unitIds', 'Alguna de las unidades no existe')
    }
    const date = input.period ?? periodOf(this.scope.today)
    const charges = await this.insert(
      units.map((unit) => ({
        unitId: unit.id,
        concept: input.concept,
        amount: input.amount,
        period: periodOf(date),
        dueOn: input.dueOn,
        description: input.description,
        sourceType: input.sourceType ?? 'manual',
        sourceId: input.sourceId,
        idempotencyKey: input.idempotencyKey,
      }))
    )
    const label =
      units.length === 1
        ? `${input.concept.name} · unidad ${units[0]!.code}`
        : `${input.concept.name} · ${units.length} unidades`
    await this.post(charges, {
      date: this.scope.today,
      type: 'charge',
      description: input.description ? `${label} · ${input.description}` : label,
      sourceType: input.sourceType ?? 'manual',
      sourceId: input.sourceId ?? undefined,
    })
    const { PaymentService } = await import('#services/finance/payments')
    await new PaymentService(this.scope).applyCredits(unitIds, this.scope.today)
    return charges
  }

  /**
   * Cancels a charge without payments (anulación). Partly paid charges get a
   * credit note for what is left instead.
   */
  async cancel(charge: Charge, reason: string) {
    if (charge.status === 'cancelled') {
      throw new Exception('El cobro ya está anulado', { status: 409 })
    }
    const paid = await charge.related('allocations').query().useTransaction(this.scope.trx).first()
    if (paid || toCents(charge.balance) !== toCents(charge.amount)) {
      throw new Exception(
        'El cobro tiene abonos o descuentos: usa una nota crédito por el saldo o reversa los pagos',
        { status: 409 }
      )
    }
    await this.adjust(charge, 'cancellation', toCents(charge.balance), reason)
    charge.status = 'cancelled'
    charge.cancelledAt = DateTime.now()
    charge.cancelledById = this.scope.userId
    charge.cancellationReason = reason
    await charge.useTransaction(this.scope.trx).save()
    return charge
  }

  /** Lowers the balance of a charge with a reason (nota crédito) */
  async creditNote(charge: Charge, amount: number, reason: string) {
    if (charge.status === 'cancelled') {
      throw new Exception('El cobro está anulado', { status: 409 })
    }
    if (amount <= 0 || amount > toCents(charge.balance)) {
      throw new FieldException('amount', `La nota no puede superar el saldo (${charge.balance})`)
    }
    await this.adjust(charge, 'credit_note', amount, reason)
    charge.status = statusFor(charge)
    await charge.useTransaction(this.scope.trx).save()
    return charge
  }

  private async adjust(
    charge: Charge,
    type: 'credit_note' | 'cancellation',
    amount: number,
    reason: string
  ) {
    const { trx, tenant, userId, ledger } = this.scope
    await charge.load('chargeConcept')
    const concept = charge.chargeConcept
    const unit = await Unit.query({ client: trx }).where('id', charge.unitId).firstOrFail()
    const adjustment = await ChargeAdjustment.create(
      {
        tenantId: tenant.id,
        chargeId: charge.id,
        type,
        amount: fromCents(amount),
        reason,
        createdById: userId,
      },
      { client: trx }
    )
    charge.balance = fromCents(toCents(charge.balance) - amount)
    const verb = type === 'cancellation' ? 'Anulación' : 'Nota crédito'
    await ledger.post({
      date: this.scope.today,
      type: 'charge_adjustment',
      description: `${verb} · ${chargeLabel(charge, concept)} · unidad ${unit.code}`,
      sourceType: 'charge_adjustment',
      sourceId: adjustment.id,
      userId,
      lines: [
        { accountId: concept.incomeAccountId!, debit: amount, description: reason },
        {
          accountId: concept.receivableAccountId!,
          credit: amount,
          unitId: charge.unitId,
          description: `${verb}: ${reason}`,
        },
      ],
    })
  }

  async concept(where: { id?: string; code?: string }) {
    const query = ChargeConcept.query({ client: this.scope.trx }).where(
      'tenant_id',
      this.scope.tenant.id
    )
    if (where.id) query.where('id', where.id)
    else if (where.code) query.where('code', where.code)
    else throw new Error('Concept id or code required')
    const concept = await query.first()
    if (!concept) throw new FieldException('conceptId', 'El concepto de cobro no existe')
    return concept
  }

  /**
   * Charges of a past month are posted on the first day of that month; if the
   * books are closed by then, on today's date.
   */
  postingDate(period: string) {
    const lockedUntil = this.scope.settings.lockedUntil
    return lockedUntil && period <= lockedUntil ? this.scope.today : period
  }
}
