import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import { type PaymentMethod, fromCents, splitByWeights, toCents } from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import Bill from '#models/finance/bill'
import { isBillableAccount } from '#services/finance/chart_template'
import BillLine from '#models/finance/bill_line'
import CashAccount from '#models/finance/cash_account'
import JournalEntry from '#models/finance/journal_entry'
import Vendor from '#models/finance/vendor'
import VendorPayment from '#models/finance/vendor_payment'
import VendorPaymentAllocation from '#models/finance/vendor_payment_allocation'
import type { PostingLine } from '#services/finance/ledger'
import type { FinanceScope } from '#services/finance/scope'
import { nextNumber } from '#services/finance/support'

export type BillInput = {
  vendorId: string
  number?: string | null
  issuedOn: string
  dueOn: string
  description: string
  lines: Array<{ accountId: string; description?: string | null; amount: number }>
  taxAmount?: number
  withholdingIncomeTax?: number
  withholdingVat?: number
  withholdingIca?: number
  /** Gasto de contado: pay it in the same step */
  payNow?: {
    cashAccountId: string
    paidOn: string
    method: PaymentMethod
    reference?: string | null
  } | null
}

function billStatus(bill: Bill): Bill['status'] {
  if (bill.status === 'cancelled') return 'cancelled'
  const balance = toCents(bill.balance)
  if (balance === 0) return 'paid'
  return balance < toCents(bill.netAmount) ? 'partially_paid' : 'pending'
}

/**
 * Payables: vendor bills and payment vouchers (comprobantes de egreso).
 * docs/finance.md §6.
 */
export class PayablesService {
  constructor(private scope: FinanceScope) {}

  private async vendor(id: string) {
    const vendor = await Vendor.query({ client: this.scope.trx })
      .where('tenant_id', this.scope.tenant.id)
      .where('id', id)
      .first()
    if (!vendor) throw new FieldException('vendorId', 'El proveedor no existe')
    return vendor
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

  async createBill(input: BillInput) {
    const { trx, tenant, userId, ledger, accounts } = this.scope
    const vendor = await this.vendor(input.vendorId)
    if (!vendor.isActive) throw new FieldException('vendorId', 'El proveedor está inactivo')

    for (const line of input.lines) {
      const account = accounts.id(line.accountId)
      if (!account || !account.isPostable || !account.isActive) {
        throw new FieldException('lines', 'Una de las cuentas no existe o no recibe movimientos')
      }
      if (!isBillableAccount(account)) {
        throw new FieldException(
          'lines',
          `La cuenta ${account.code} no es de gasto ni de activo fijo o diferido`
        )
      }
    }
    const subtotal = input.lines.reduce((sum, line) => sum + line.amount, 0)
    const tax = input.taxAmount ?? 0
    const withholdings = {
      income: input.withholdingIncomeTax ?? 0,
      vat: input.withholdingVat ?? 0,
      ica: input.withholdingIca ?? 0,
    }
    const total = subtotal + tax
    const net = total - withholdings.income - withholdings.vat - withholdings.ica
    if (net <= 0) {
      throw new FieldException(
        'withholdingIncomeTax',
        'Las retenciones no pueden igualar o superar el total'
      )
    }
    if (input.dueOn < input.issuedOn) {
      throw new FieldException(
        'dueOn',
        'El vencimiento no puede ser anterior a la fecha de la factura'
      )
    }

    const bill = await Bill.create(
      {
        tenantId: tenant.id,
        vendorId: vendor.id,
        number: input.number ?? null,
        issuedOn: DateTime.fromISO(input.issuedOn),
        dueOn: DateTime.fromISO(input.dueOn),
        description: input.description,
        subtotal: fromCents(subtotal),
        taxAmount: fromCents(tax),
        withholdingIncomeTax: fromCents(withholdings.income),
        withholdingVat: fromCents(withholdings.vat),
        withholdingIca: fromCents(withholdings.ica),
        total: fromCents(total),
        netAmount: fromCents(net),
        balance: fromCents(net),
        status: 'pending',
        createdById: userId,
      },
      { client: trx }
    )
    await BillLine.createMany(
      input.lines.map((line) => ({
        tenantId: tenant.id,
        billId: bill.id,
        accountId: line.accountId,
        description: line.description ?? null,
        amount: fromCents(line.amount),
      })),
      { client: trx }
    )

    // VAT is a higher cost for the copropiedad (not VAT responsible)
    const taxParts = splitByWeights(
      tax,
      input.lines.map((line) => line.amount)
    )
    const label = `${vendor.name}${input.number ? ` · factura ${input.number}` : ''}`
    const lines: PostingLine[] = input.lines.map((line, i) => ({
      accountId: line.accountId,
      debit: line.amount + taxParts[i]!,
      vendorId: vendor.id,
      description: line.description ?? input.description,
    }))
    lines.push({
      accountId: accounts.key('payables.vendors').id,
      credit: net,
      vendorId: vendor.id,
      description: input.description,
    })
    const withholdingLines: Array<[string, number, string]> = [
      ['withholding.income_tax', withholdings.income, 'Retención en la fuente'],
      ['withholding.vat', withholdings.vat, 'Retención de IVA'],
      ['withholding.ica', withholdings.ica, 'Retención de ICA'],
    ]
    for (const [key, amount, text] of withholdingLines) {
      if (amount > 0) {
        lines.push({
          accountId: accounts.key(key).id,
          credit: amount,
          vendorId: vendor.id,
          description: text,
        })
      }
    }
    await ledger.post({
      date: input.issuedOn,
      type: 'bill',
      description: `Cuenta por pagar · ${label}`,
      sourceType: 'bill',
      sourceId: bill.id,
      userId,
      lines,
    })

    if (input.payNow) {
      await this.pay({
        vendorId: vendor.id,
        cashAccountId: input.payNow.cashAccountId,
        paidOn: input.payNow.paidOn,
        method: input.payNow.method,
        reference: input.payNow.reference,
        allocations: [{ billId: bill.id, amount: net }],
      })
      await bill.refresh()
    }
    return bill
  }

  async cancelBill(bill: Bill, reason: string) {
    const { trx, ledger, userId } = this.scope
    if (bill.status === 'cancelled')
      throw new Exception('La cuenta ya está anulada', { status: 409 })
    if (toCents(bill.balance) !== toCents(bill.netAmount)) {
      throw new Exception('La cuenta tiene pagos: reversa los egresos primero', { status: 409 })
    }
    const entry = await JournalEntry.query({ client: trx })
      .where('tenant_id', bill.tenantId)
      .where('source_type', 'bill')
      .where('source_id', bill.id)
      .whereNull('reverses_entry_id')
      .firstOrFail()
    await ledger.reverse(entry, {
      date: this.scope.today,
      description: `Anulación ${entry.description} · ${reason}`,
      userId,
    })
    bill.status = 'cancelled'
    bill.balance = '0.00'
    bill.cancelledAt = DateTime.now()
    bill.cancelledById = userId
    bill.cancellationReason = reason
    await bill.useTransaction(trx).save()
    return bill
  }

  /**
   * Comprobante de egreso. Without explicit allocations it pays the vendor's
   * oldest bills first; it cannot pay more than what is owed.
   */
  async pay(input: {
    vendorId: string
    cashAccountId: string
    paidOn: string
    method: PaymentMethod
    reference?: string | null
    notes?: string | null
    amount?: number
    allocations?: Array<{ billId: string; amount: number }>
  }) {
    const { trx, tenant, userId, ledger, accounts } = this.scope
    const vendor = await this.vendor(input.vendorId)
    const cashAccount = await this.cashAccount(input.cashAccountId)
    ledger.assertOpen(input.paidOn, 'paidOn')

    const open = await Bill.query({ client: trx })
      .where('tenant_id', tenant.id)
      .where('vendor_id', vendor.id)
      .whereIn('status', ['pending', 'partially_paid'])
      .orderBy('due_on')
      .orderBy('issued_on')
      .forUpdate()

    const plan: Array<{ bill: Bill; amount: number }> = []
    if (input.allocations?.length) {
      for (const item of input.allocations) {
        const bill = open.find((candidate) => candidate.id === item.billId)
        if (!bill)
          throw new FieldException(
            'allocations',
            'Una de las cuentas no está pendiente con este proveedor'
          )
        if (item.amount <= 0 || item.amount > toCents(bill.balance)) {
          throw new FieldException(
            'allocations',
            `El pago a una cuenta supera su saldo (${bill.balance})`
          )
        }
        plan.push({ bill, amount: item.amount })
      }
    } else {
      let remaining = input.amount ?? 0
      if (remaining <= 0) throw new FieldException('amount', 'Indica el valor a pagar')
      const owed = open.reduce((sum, bill) => sum + toCents(bill.balance), 0)
      if (remaining > owed) {
        throw new FieldException(
          'amount',
          `Al proveedor se le deben ${fromCents(owed)}: no se puede pagar más`
        )
      }
      for (const bill of open) {
        if (remaining <= 0) break
        const amount = Math.min(remaining, toCents(bill.balance))
        plan.push({ bill, amount })
        remaining -= amount
      }
    }
    const amount = plan.reduce((sum, item) => sum + item.amount, 0)
    if (amount <= 0) throw new FieldException('amount', 'No hay nada que pagar')

    const payment = await VendorPayment.create(
      {
        tenantId: tenant.id,
        number: await nextNumber(trx, tenant.id, 'vendor_payment'),
        vendorId: vendor.id,
        cashAccountId: cashAccount.id,
        paidOn: DateTime.fromISO(input.paidOn),
        amount: fromCents(amount),
        method: input.method,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        status: 'confirmed',
        createdById: userId,
      },
      { client: trx }
    )
    for (const { bill, amount: paid } of plan) {
      await VendorPaymentAllocation.create(
        {
          tenantId: tenant.id,
          vendorPaymentId: payment.id,
          billId: bill.id,
          amount: fromCents(paid),
        },
        { client: trx }
      )
      bill.balance = fromCents(toCents(bill.balance) - paid)
      bill.status = billStatus(bill)
      await bill.useTransaction(trx).save()
    }

    await ledger.post({
      date: input.paidOn,
      type: 'vendor_payment',
      description: `Comprobante de egreso ${payment.number} · ${vendor.name}`,
      sourceType: 'vendor_payment',
      sourceId: payment.id,
      userId,
      lines: [
        {
          accountId: accounts.key('payables.vendors').id,
          debit: amount,
          vendorId: vendor.id,
          description: plan.map(({ bill }) => bill.number ?? bill.description).join(', '),
        },
        {
          accountId: cashAccount.ledgerAccountId,
          credit: amount,
          vendorId: vendor.id,
          description: input.reference ? `Ref. ${input.reference}` : null,
        },
      ],
    })
    return payment
  }

  async reversePayment(payment: VendorPayment, reason: string) {
    const { trx, ledger, userId } = this.scope
    if (payment.status !== 'confirmed')
      throw new Exception('El egreso ya fue reversado', { status: 409 })
    const allocations = await VendorPaymentAllocation.query({ client: trx })
      .where('vendor_payment_id', payment.id)
      .preload('bill')
    for (const allocation of allocations) {
      const bill = allocation.bill
      bill.balance = fromCents(toCents(bill.balance) + toCents(allocation.amount))
      bill.status = billStatus(bill)
      await bill.useTransaction(trx).save()
    }
    await VendorPaymentAllocation.query({ client: trx })
      .where('vendor_payment_id', payment.id)
      .delete()
    const entry = await JournalEntry.query({ client: trx })
      .where('tenant_id', payment.tenantId)
      .where('source_type', 'vendor_payment')
      .where('source_id', payment.id)
      .whereNull('reverses_entry_id')
      .firstOrFail()
    await ledger.reverse(entry, {
      date: this.scope.today,
      description: `Reversión ${entry.description} · ${reason}`,
      userId,
    })
    payment.status = 'reversed'
    payment.reversedAt = DateTime.now()
    payment.reversedById = userId
    payment.reversalReason = reason
    await payment.useTransaction(trx).save()
    return payment
  }
}
