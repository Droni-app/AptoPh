import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import { fromCents, toCents } from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import Charge from '#models/charge'
import JournalEntry from '#models/journal_entry'
import type Tenant from '#models/tenant'
import { FinanceReports } from '#services/finance/reports'
import { todayFor } from '#services/finance/support'
import { paginated, serializeCharge, serializeEntry } from '#transformers/finance'
import {
  ledgerReportValidator,
  listJournalValidator,
  manualEntryValidator,
  rangeValidator,
  reasonValidator,
  statementValidator,
} from '#validators/finance'
import { finance, rangeOf } from '#controllers/finance/helpers'

/** Vouchers that only exist in the ledger and can be reversed from here */
const REVERSIBLE = new Set(['manual', 'transfer', 'opening'])

/**
 * Statement of a unit: ledger movements plus what it owes now.
 * Shared by the back-office and the residents' portal.
 */
export async function unitStatement(
  tenant: Tenant,
  unitId: string,
  range: { from?: string; to?: string }
) {
  const reports = new FinanceReports(tenant)
  const [statement, open, credit] = await Promise.all([
    reports.unitStatement(unitId, range.from ?? null, range.to ?? null),
    Charge.query()
      .where('tenant_id', tenant.id)
      .where('unit_id', unitId)
      .whereIn('status', ['pending', 'partially_paid'])
      .where('balance', '>', 0)
      .preload('chargeConcept')
      .orderBy('due_on')
      .orderBy('period'),
    tenant
      .related('payments')
      .query()
      .where('unit_id', unitId)
      .where('status', 'confirmed')
      .sum('unapplied_amount as total')
      .first(),
  ])
  const today = todayFor(tenant)
  const debt = open.reduce((sum, charge) => sum + toCents(charge.balance), 0)
  const overdue = open
    .filter((charge) => charge.dueOn.toISODate()! < today)
    .reduce((sum, charge) => sum + toCents(charge.balance), 0)
  const creditBalance = toCents(credit?.$extras.total)
  const discount = open
    .filter(
      (charge) =>
        charge.discountUntil &&
        charge.discountUntil.toISODate()! >= today &&
        toCents(charge.balance) === toCents(charge.amount)
    )
    .reduce((sum, charge) => sum + toCents(charge.discountAmount), 0)
  return {
    ...statement,
    openCharges: open.map(serializeCharge),
    debt: fromCents(debt),
    overdue: fromCents(overdue),
    credit: fromCents(creditBalance),
    /** What to pay today to be up to date (discounts on time included) */
    toPay: fromCents(Math.max(0, debt - creditBalance - discount)),
    availableDiscount: fromCents(discount),
  }
}

/**
 * Journal (comprobantes), accounting reports, statements and aging.
 */
export default class AccountingController {
  async journal({ tenant, request }: HttpContext) {
    const filters = await request.validateUsing(listJournalValidator, { data: request.qs() })
    const query = tenant
      .related('journalEntries')
      .query()
      .preload('createdBy')
      .orderBy('date', 'desc')
      .orderBy('number', 'desc')
    if (filters.from) query.where('date', '>=', filters.from)
    if (filters.to) query.where('date', '<=', filters.to)
    if (filters.type) query.where('type', filters.type)
    if (filters.search) {
      const search = filters.search
      query.where((q) => {
        q.whereILike('description', `%${search}%`)
        if (/^\d+$/.test(search)) q.orWhere('number', Number(search))
      })
    }
    const page = await query.paginate(filters.page ?? 1, filters.perPage ?? 25)
    return paginated(page, serializeEntry)
  }

  async showEntry({ tenant, params }: HttpContext) {
    const entry = await tenant
      .related('journalEntries')
      .query()
      .where('id', params.id)
      .preload('createdBy')
      .preload('lines', (lines) =>
        lines.preload('account').preload('unit').preload('vendor').orderBy('debit', 'desc')
      )
      .firstOrFail()
    return { data: serializeEntry(entry) }
  }

  /** Nota de contabilidad */
  async storeEntry(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(manualEntryValidator)
    const lines = data.lines.map((line, index) => {
      const debit = toCents(line.debit ?? 0)
      const credit = toCents(line.credit ?? 0)
      if (debit > 0 === credit > 0) {
        throw new FieldException(`lines.${index}`, 'Cada línea lleva un débito o un crédito')
      }
      if (line.unitId && line.vendorId) {
        throw new FieldException(`lines.${index}`, 'Una línea tiene un solo tercero')
      }
      return { ...line, debit, credit }
    })
    const entry = await finance(ctx, async (scope) => {
      const unitIds = [...new Set(lines.map((line) => line.unitId).filter(Boolean))] as string[]
      const vendorIds = [...new Set(lines.map((line) => line.vendorId).filter(Boolean))] as string[]
      if (unitIds.length) {
        const found = await ctx.tenant
          .related('units')
          .query()
          .useTransaction(scope.trx)
          .whereIn('id', unitIds)
        if (found.length !== unitIds.length)
          throw new FieldException('lines', 'Una de las unidades no existe')
      }
      if (vendorIds.length) {
        const found = await ctx.tenant
          .related('vendors')
          .query()
          .useTransaction(scope.trx)
          .whereIn('id', vendorIds)
        if (found.length !== vendorIds.length)
          throw new FieldException('lines', 'Uno de los proveedores no existe')
      }
      for (const line of lines) {
        const account = scope.accounts.id(line.accountId)
        if (account && !account.isActive) {
          throw new FieldException('lines', `La cuenta ${account.code} está inactiva`)
        }
      }
      return scope.ledger.post({
        date: data.date,
        type: 'manual',
        description: data.description,
        sourceType: 'manual',
        userId: scope.userId,
        lines,
      })
    })
    await entry!.load((loader) => {
      loader
        .load('createdBy')
        .load('lines', (q) => q.preload('account').preload('unit').preload('vendor'))
    })
    ctx.response.status(201)
    return { data: serializeEntry(entry!) }
  }

  async reverseEntry(ctx: HttpContext) {
    const { reason } = await ctx.request.validateUsing(reasonValidator)
    const reversal = await finance(ctx, async (scope) => {
      const entry = await JournalEntry.query({ client: scope.trx })
        .where('tenant_id', ctx.tenant.id)
        .where('id', ctx.params.id)
        .forUpdate()
        .firstOrFail()
      if (entry.reversedByEntryId) {
        throw new Exception(`El comprobante ${entry.number} ya fue reversado`, { status: 409 })
      }
      if (!REVERSIBLE.has(entry.type) || entry.reversesEntryId) {
        throw new Exception(
          'Este comprobante se reversa desde su origen (pago, cobro, factura o egreso)',
          { status: 409 }
        )
      }
      return scope.ledger.reverse(entry, {
        date: scope.today,
        description: `Reversión comprobante ${entry.number} · ${reason}`,
        userId: scope.userId,
      })
    })
    return { data: { id: reversal!.id, number: reversal!.number } }
  }

  async trialBalance({ tenant, request }: HttpContext) {
    const input = await request.validateUsing(rangeValidator, { data: request.qs() })
    const { from, to } = rangeOf(tenant, input)
    return { data: await new FinanceReports(tenant).trialBalance(from, to, input.level ?? 5) }
  }

  async incomeStatement({ tenant, request }: HttpContext) {
    const input = await request.validateUsing(rangeValidator, { data: request.qs() })
    const { from, to } = rangeOf(tenant, input)
    return { data: await new FinanceReports(tenant).incomeStatement(from, to) }
  }

  async balanceSheet({ tenant, request }: HttpContext) {
    const input = await request.validateUsing(rangeValidator, { data: request.qs() })
    const { to } = rangeOf(tenant, input)
    return { data: await new FinanceReports(tenant).balanceSheet(to, input.level ?? 4) }
  }

  async ledger({ tenant, request }: HttpContext) {
    const input = await request.validateUsing(ledgerReportValidator, { data: request.qs() })
    const { from, to } = rangeOf(tenant, input)
    const report = await new FinanceReports(tenant).ledger({ ...input, from, to })
    if (!report) throw new FieldException('accountId', 'La cuenta no existe')
    return { data: report }
  }

  async statement({ tenant, params, request }: HttpContext) {
    const range = await request.validateUsing(statementValidator, { data: request.qs() })
    const unit = await tenant
      .related('units')
      .query()
      .where('id', params.unitId)
      .preload('building')
      .firstOrFail()
    return {
      data: {
        unit: {
          id: unit.id,
          code: unit.code,
          type: unit.type,
          building: unit.building?.name ?? null,
        },
        ...(await unitStatement(tenant, unit.id, range)),
      },
    }
  }

  async receivables({ tenant }: HttpContext) {
    return { data: await new FinanceReports(tenant).receivablesAging() }
  }

  async payables({ tenant }: HttpContext) {
    return { data: await new FinanceReports(tenant).payablesAging() }
  }
}
