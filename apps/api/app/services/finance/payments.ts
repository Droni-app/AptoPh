import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import { type PaymentMethod, fromCents, toCents } from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import CashAccount from '#models/finance/cash_account'
import Charge from '#models/finance/charge'
import ChargeAdjustment from '#models/finance/charge_adjustment'
import JournalEntry from '#models/finance/journal_entry'
import Payment from '#models/finance/payment'
import PaymentAllocation from '#models/finance/payment_allocation'
import Unit from '#models/property/unit'
import { chargeLabel, statusFor } from '#services/finance/charges'
import type { PostingLine } from '#services/finance/ledger'
import type { FinanceScope } from '#services/finance/scope'
import { iso, nextNumber } from '#services/finance/support'

type Applied = {
  allocations: Array<{ charge: Charge; amount: number }>
  discounts: Array<{ charge: Charge; amount: number }>
  /** Cents left over */
  remaining: number
}

export type ManualAllocation = { chargeId: string; amount: number }

/**
 * Recaudo: cash receipts, their application to charges, credit balances
 * (saldo a favor) and reversals. docs/finance.md §5.
 */
export class PaymentService {
  constructor(private scope: FinanceScope) {}

  /**
   * Open charges of a unit in the order payments apply to them: interest first
   * (art. 1653 Código Civil) unless configured otherwise, then by due date.
   */
  private async openCharges(unitId: string, onlyIds?: string[]) {
    const query = Charge.query({ client: this.scope.trx })
      .where('charges.tenant_id', this.scope.tenant.id)
      .where('unit_id', unitId)
      .whereIn('status', ['pending', 'partially_paid'])
      .where('balance', '>', 0)
      .preload('chargeConcept')
      .preload('adjustments', (adjustments) => adjustments.where('type', 'early_payment_discount'))
      .forUpdate()
    if (onlyIds) query.whereIn('id', onlyIds)
    if (this.scope.settings.applicationOrder === 'interest_first') {
      query.orderByRaw(
        "CASE WHEN (SELECT type FROM charge_concepts c WHERE c.id = charges.charge_concept_id) = 'interest' THEN 0 ELSE 1 END"
      )
    }
    return query.orderBy('due_on').orderBy('period').orderBy('created_at')
  }

  /**
   * Applies `amount` cents paid on `paidOn` to the unit's open charges and
   * writes the allocations, discounts and new balances.
   */
  private async apply(
    payment: Payment,
    amount: number,
    paidOn: string,
    manual?: ManualAllocation[]
  ): Promise<Applied> {
    const { trx, tenant, userId } = this.scope
    const result: Applied = { allocations: [], discounts: [], remaining: amount }

    const plan: Array<{ charge: Charge; amount?: number }> = []
    if (manual?.length) {
      const charges = await this.openCharges(
        payment.unitId,
        manual.map((item) => item.chargeId)
      )
      for (const item of manual) {
        const charge = charges.find((candidate) => candidate.id === item.chargeId)
        if (!charge) {
          throw new FieldException(
            'allocations',
            'Uno de los cobros no está pendiente en esta unidad'
          )
        }
        if (item.amount <= 0 || item.amount > toCents(charge.balance)) {
          throw new FieldException(
            'allocations',
            `El abono a un cobro supera su saldo (${charge.balance})`
          )
        }
        plan.push({ charge, amount: item.amount })
      }
      const total = manual.reduce((sum, item) => sum + item.amount, 0)
      if (total > amount) {
        throw new FieldException('allocations', 'Los abonos suman más que el valor del pago')
      }
    } else {
      for (const charge of await this.openCharges(payment.unitId)) plan.push({ charge })
    }

    for (const step of plan) {
      if (result.remaining <= 0) break
      const charge = step.charge
      const balance = toCents(charge.balance)
      let applied = 0
      let discount = 0

      if (step.amount !== undefined) {
        applied = step.amount
      } else {
        // Early payment discount: the charge is paid in full on time
        const offered = Math.min(toCents(charge.discountAmount), balance)
        const eligible =
          offered > 0 &&
          charge.discountUntil !== null &&
          paidOn <= iso(charge.discountUntil)! &&
          charge.adjustments.length === 0
        if (eligible && result.remaining >= balance - offered) {
          discount = offered
          applied = balance - offered
        } else {
          applied = Math.min(result.remaining, balance)
        }
      }

      if (discount > 0) {
        await ChargeAdjustment.create(
          {
            tenantId: tenant.id,
            chargeId: charge.id,
            type: 'early_payment_discount',
            amount: fromCents(discount),
            reason: 'Pago a tiempo',
            paymentId: payment.id,
            createdById: userId,
          },
          { client: trx }
        )
        result.discounts.push({ charge, amount: discount })
      }
      if (applied > 0) {
        const existing = await PaymentAllocation.query({ client: trx })
          .where('payment_id', payment.id)
          .where('charge_id', charge.id)
          .first()
        if (existing) {
          existing.amount = fromCents(toCents(existing.amount) + applied)
          await existing.useTransaction(trx).save()
        } else {
          await PaymentAllocation.create(
            {
              tenantId: tenant.id,
              paymentId: payment.id,
              chargeId: charge.id,
              amount: fromCents(applied),
            },
            { client: trx }
          )
        }
        result.allocations.push({ charge, amount: applied })
      }
      charge.balance = fromCents(balance - applied - discount)
      charge.status = statusFor(charge)
      await charge.useTransaction(trx).save()
      result.remaining -= applied
    }

    payment.unappliedAmount = fromCents(
      toCents(payment.unappliedAmount) - (amount - result.remaining)
    )
    await payment.useTransaction(trx).save()
    return result
  }

  /** Credit lines of an application: receivables (and discounts) of the unit */
  private applicationLines(applied: Applied): PostingLine[] {
    const lines: PostingLine[] = []
    for (const { charge, amount } of applied.allocations) {
      lines.push({
        accountId: charge.chargeConcept.receivableAccountId!,
        credit: amount,
        unitId: charge.unitId,
        description: `Abono · ${chargeLabel(charge, charge.chargeConcept)}`,
      })
    }
    for (const { charge, amount } of applied.discounts) {
      lines.push(
        {
          accountId: this.scope.accounts.key('discounts.early_payment').id,
          debit: amount,
          unitId: charge.unitId,
          description: `Descuento pronto pago · ${chargeLabel(charge, charge.chargeConcept)}`,
        },
        {
          accountId: charge.chargeConcept.receivableAccountId!,
          credit: amount,
          unitId: charge.unitId,
          description: `Descuento pronto pago · ${chargeLabel(charge, charge.chargeConcept)}`,
        }
      )
    }
    return lines
  }

  private async cashAccount(id: string) {
    const account = await CashAccount.query({ client: this.scope.trx })
      .where('tenant_id', this.scope.tenant.id)
      .where('id', id)
      .first()
    if (!account) throw new FieldException('cashAccountId', 'La cuenta bancaria o caja no existe')
    if (!account.isActive) throw new FieldException('cashAccountId', 'La cuenta está inactiva')
    return account
  }

  /**
   * Confirms the payment: receipt number, application to charges and the cash
   * receipt voucher (debit bank, credit receivables and advances).
   */
  private async settle(payment: Payment, cashAccount: CashAccount, manual?: ManualAllocation[]) {
    const { trx, tenant, ledger, userId } = this.scope
    const paidOn = payment.paidAt.setZone(tenant.timezone || 'America/Bogota').toISODate()!
    ledger.assertOpen(paidOn, 'paidAt')

    payment.status = 'confirmed'
    payment.cashAccountId = cashAccount.id
    payment.number = await nextNumber(trx, tenant.id, 'receipt')
    payment.confirmedById = userId
    payment.reviewedAt = DateTime.now()
    payment.unappliedAmount = payment.amount
    await payment.useTransaction(trx).save()

    const amount = toCents(payment.amount)
    const applied = await this.apply(payment, amount, paidOn, manual)
    const unit = await Unit.query({ client: trx }).where('id', payment.unitId).firstOrFail()

    const lines: PostingLine[] = [
      {
        accountId: cashAccount.ledgerAccountId,
        debit: amount,
        unitId: payment.unitId,
        description: payment.reference ? `Ref. ${payment.reference}` : null,
      },
      ...this.applicationLines(applied),
    ]
    if (applied.remaining > 0) {
      lines.push({
        accountId: this.scope.accounts.key('advances.units').id,
        credit: applied.remaining,
        unitId: payment.unitId,
        description: 'Saldo a favor',
      })
    }
    await ledger.post({
      date: paidOn,
      type: 'payment',
      description: `Recibo de caja ${payment.number} · unidad ${unit.code}`,
      sourceType: 'payment',
      sourceId: payment.id,
      userId,
      lines,
    })
    return payment
  }

  /** The administration registers a payment it received */
  async register(input: {
    unitId: string
    amount: number
    paidAt: DateTime
    method: PaymentMethod
    reference?: string | null
    notes?: string | null
    cashAccountId: string
    allocations?: ManualAllocation[]
  }) {
    const { trx, tenant, userId } = this.scope
    const unit = await Unit.query({ client: trx })
      .where('tenant_id', tenant.id)
      .where('id', input.unitId)
      .whereNull('deleted_at')
      .first()
    if (!unit) throw new FieldException('unitId', 'La unidad no existe')
    const cashAccount = await this.cashAccount(input.cashAccountId)
    const payment = await Payment.create(
      {
        tenantId: tenant.id,
        unitId: unit.id,
        amount: fromCents(input.amount),
        paidAt: input.paidAt,
        method: input.method,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        status: 'pending_review',
        registeredById: userId,
        unappliedAmount: fromCents(input.amount),
      },
      { client: trx }
    )
    return this.settle(payment, cashAccount, input.allocations)
  }

  /** Confirms a payment reported by a resident */
  async confirm(payment: Payment, cashAccountId: string) {
    if (payment.status !== 'pending_review') {
      throw new Exception('Este pago ya fue revisado', { status: 409 })
    }
    return this.settle(payment, await this.cashAccount(cashAccountId))
  }

  async reject(payment: Payment, reason: string) {
    if (payment.status !== 'pending_review') {
      throw new Exception('Este pago ya fue revisado', { status: 409 })
    }
    payment.status = 'rejected'
    payment.rejectionReason = reason
    payment.reviewedAt = DateTime.now()
    payment.confirmedById = this.scope.userId
    await payment.useTransaction(this.scope.trx).save()
    return payment
  }

  /**
   * Reverses a confirmed payment: charges get their balance back (discounts
   * included) and a voucher undoes the receipt and any credit applications.
   */
  async reverse(payment: Payment, reason: string) {
    const { trx, ledger, userId, accounts } = this.scope
    if (payment.status !== 'confirmed') {
      throw new Exception('Solo se pueden reversar pagos confirmados', { status: 409 })
    }
    const allocations = await PaymentAllocation.query({ client: trx })
      .where('payment_id', payment.id)
      .preload('charge', (query) => query.preload('chargeConcept'))
    const discounts = await ChargeAdjustment.query({ client: trx })
      .where('payment_id', payment.id)
      .where('type', 'early_payment_discount')
      .preload('charge', (query) => query.preload('chargeConcept'))
    const cashAccount = await CashAccount.findOrFail(payment.cashAccountId, { client: trx })
    const unit = await Unit.query({ client: trx }).where('id', payment.unitId).firstOrFail()

    const lines: PostingLine[] = [
      { accountId: cashAccount.ledgerAccountId, credit: toCents(payment.amount), unitId: unit.id },
    ]
    const restore = new Map<string, { charge: Charge; amount: number }>()
    for (const allocation of allocations) {
      const amount = toCents(allocation.amount)
      lines.push({
        accountId: allocation.charge.chargeConcept.receivableAccountId!,
        debit: amount,
        unitId: unit.id,
        description: `Reversión abono · ${chargeLabel(allocation.charge, allocation.charge.chargeConcept)}`,
      })
      const entry = restore.get(allocation.chargeId) ?? { charge: allocation.charge, amount: 0 }
      entry.amount += amount
      restore.set(allocation.chargeId, entry)
    }
    for (const discount of discounts) {
      const amount = toCents(discount.amount)
      lines.push(
        {
          accountId: discount.charge.chargeConcept.receivableAccountId!,
          debit: amount,
          unitId: unit.id,
          description: 'Reversión descuento pronto pago',
        },
        {
          accountId: accounts.key('discounts.early_payment').id,
          credit: amount,
          unitId: unit.id,
          description: 'Reversión descuento pronto pago',
        }
      )
      const entry = restore.get(discount.chargeId) ?? { charge: discount.charge, amount: 0 }
      entry.amount += amount
      restore.set(discount.chargeId, entry)
    }
    const unapplied = toCents(payment.unappliedAmount)
    if (unapplied > 0) {
      lines.push({
        accountId: accounts.key('advances.units').id,
        debit: unapplied,
        unitId: unit.id,
        description: 'Reversión saldo a favor',
      })
    }

    await ledger.post({
      date: this.scope.today,
      type: 'payment_reversal',
      description: `Reversión recibo de caja ${payment.number} · unidad ${unit.code} · ${reason}`,
      sourceType: 'payment',
      sourceId: payment.id,
      userId,
      lines,
    })

    for (const { charge, amount } of restore.values()) {
      const fresh = await Charge.query({ client: trx })
        .where('id', charge.id)
        .forUpdate()
        .firstOrFail()
      fresh.balance = fromCents(toCents(fresh.balance) + amount)
      fresh.status = statusFor(fresh)
      await fresh.useTransaction(trx).save()
    }
    await PaymentAllocation.query({ client: trx }).where('payment_id', payment.id).delete()
    await ChargeAdjustment.query({ client: trx })
      .where('payment_id', payment.id)
      .where('type', 'early_payment_discount')
      .delete()

    payment.status = 'reversed'
    payment.unappliedAmount = '0.00'
    payment.reversedAt = DateTime.now()
    payment.reversedById = userId
    payment.reversalReason = reason
    await payment.useTransaction(trx).save()
    return payment
  }

  /**
   * Uses the units' credit (saldo a favor, oldest payment first) to pay their
   * open charges, in one voucher dated `date`.
   */
  async applyCredits(unitIds: string[], date: string) {
    const { trx, tenant, ledger, userId, accounts } = this.scope
    if (unitIds.length === 0) return
    const payments = await Payment.query({ client: trx })
      .where('tenant_id', tenant.id)
      .whereIn('unit_id', [...new Set(unitIds)])
      .where('status', 'confirmed')
      .where('unapplied_amount', '>', 0)
      .orderBy('paid_at')
      .forUpdate()
    if (payments.length === 0) return

    const lines: PostingLine[] = []
    for (const payment of payments) {
      const credit = toCents(payment.unappliedAmount)
      const paidOn = payment.paidAt.setZone(tenant.timezone || 'America/Bogota').toISODate()!
      const applied = await this.apply(payment, credit, paidOn)
      const used = credit - applied.remaining
      if (used === 0 && applied.discounts.length === 0) continue
      lines.push(...this.applicationLines(applied))
      if (used > 0) {
        lines.push({
          accountId: accounts.key('advances.units').id,
          debit: used,
          unitId: payment.unitId,
          description: `Aplicación saldo a favor · recibo ${payment.number}`,
        })
      }
    }
    if (lines.length === 0) return
    await ledger.post({
      date,
      type: 'credit_application',
      description: 'Aplicación de saldos a favor',
      sourceType: 'credit_application',
      userId,
      lines,
    })
  }

  /** Vouchers of a payment, for its detail */
  static entriesOf(paymentId: string) {
    return JournalEntry.query().where('source_type', 'payment').where('source_id', paymentId)
  }
}
