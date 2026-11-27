import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { toCents } from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import Bill from '#models/finance/bill'
import type Tenant from '#models/tenants/tenant'
import VendorPayment from '#models/finance/vendor_payment'
import { PayablesService } from '#services/finance/payables'
import { isBillableAccount } from '#services/finance/chart_template'
import {
  paginated,
  serializeBill,
  serializeVendor,
  serializeVendorPayment,
} from '#transformers/finance/finance'
import {
  billValidator,
  listBillsValidator,
  listVendorPaymentsValidator,
  listVendorsValidator,
  reasonValidator,
  vendorPaymentValidator,
  vendorValidator,
} from '#validators/finance/finance'
import { finance } from '#controllers/finance/helpers'

type VendorBody = Awaited<ReturnType<typeof vendorValidator.validate>>

const OPEN_BALANCE =
  "(SELECT COALESCE(SUM(b.balance), 0) FROM bills b WHERE b.vendor_id = vendors.id AND b.status IN ('pending', 'partially_paid')) AS balance"

async function checkVendor(tenant: Tenant, data: VendorBody, vendorId?: string) {
  if (data.documentNumber) {
    const query = tenant.related('vendors').query().where('document_number', data.documentNumber)
    if (vendorId) query.whereNot('id', vendorId)
    if (await query.first()) {
      throw new FieldException('documentNumber', 'Ya hay un proveedor con ese documento')
    }
  }
  if (data.defaultAccountId) {
    const account = await tenant
      .related('ledgerAccounts')
      .query()
      .where('id', data.defaultAccountId)
      .where('is_postable', true)
      .first()
    if (!account || !isBillableAccount(account))
      throw new FieldException('defaultAccountId', 'La cuenta de gasto no es válida')
  }
}

async function presentBill(bill: Bill) {
  await bill.load((loader) => {
    loader
      .load('vendor')
      .load('lines', (lines) => lines.preload('account'))
      .load('allocations', (allocations) => allocations.preload('vendorPayment'))
  })
  return serializeBill(bill)
}

async function presentPayment(payment: VendorPayment) {
  await payment.load((loader) => {
    loader
      .load('vendor')
      .load('cashAccount')
      .load('allocations', (allocations) => allocations.preload('bill'))
  })
  return serializeVendorPayment(payment)
}

/**
 * Gastos: vendors, their bills (cuentas por pagar) and payment vouchers (egresos).
 */
export default class PayablesController {
  async vendors({ tenant, request }: HttpContext) {
    const filters = await request.validateUsing(listVendorsValidator, { data: request.qs() })
    const query = tenant
      .related('vendors')
      .query()
      .select('vendors.*')
      .select(db.raw(OPEN_BALANCE))
      .preload('defaultAccount')
      .orderBy('is_active', 'desc')
      .orderBy('name')
    if (filters.active !== undefined) query.where('is_active', filters.active)
    if (filters.search) {
      query.where((q) =>
        q
          .whereILike('name', `%${filters.search}%`)
          .orWhereILike('document_number', `%${filters.search}%`)
      )
    }
    const vendors = await query
    return { data: vendors.map(serializeVendor) }
  }

  async showVendor({ tenant, params }: HttpContext) {
    const vendor = await tenant
      .related('vendors')
      .query()
      .select('vendors.*')
      .select(db.raw(OPEN_BALANCE))
      .where('id', params.id)
      .preload('defaultAccount')
      .firstOrFail()
    return { data: serializeVendor(vendor) }
  }

  async storeVendor({ tenant, request, response }: HttpContext) {
    const data = await request.validateUsing(vendorValidator)
    await checkVendor(tenant, data)
    const vendor = await tenant.related('vendors').create({
      ...data,
      defaultAccountId: data.defaultAccountId ?? null,
      isActive: data.isActive ?? true,
    })
    await vendor.load('defaultAccount')
    response.status(201)
    return { data: serializeVendor(vendor) }
  }

  async updateVendor({ tenant, params, request }: HttpContext) {
    const vendor = await tenant.related('vendors').query().where('id', params.id).firstOrFail()
    const data = await request.validateUsing(vendorValidator)
    await checkVendor(tenant, data, vendor.id)
    vendor.merge(data)
    await vendor.save()
    await vendor.load('defaultAccount')
    return { data: serializeVendor(vendor) }
  }

  async bills({ tenant, request }: HttpContext) {
    const filters = await request.validateUsing(listBillsValidator, { data: request.qs() })
    const query = tenant
      .related('bills')
      .query()
      .preload('vendor')
      .orderBy('issued_on', 'desc')
      .orderBy('created_at', 'desc')
    if (filters.status === 'open') query.whereIn('status', ['pending', 'partially_paid'])
    else if (filters.status) query.where('status', filters.status)
    if (filters.vendorId) query.where('vendor_id', filters.vendorId)
    if (filters.from) query.where('issued_on', '>=', filters.from)
    if (filters.to) query.where('issued_on', '<=', filters.to)
    const page = await query.paginate(filters.page ?? 1, filters.perPage ?? 25)
    return paginated(page, serializeBill)
  }

  async showBill({ tenant, params }: HttpContext) {
    const bill = await tenant.related('bills').query().where('id', params.id).firstOrFail()
    return { data: await presentBill(bill) }
  }

  async storeBill(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(billValidator)
    if (data.number) {
      const duplicate = await ctx.tenant
        .related('bills')
        .query()
        .where('vendor_id', data.vendorId)
        .where('number', data.number)
        .whereNot('status', 'cancelled')
        .first()
      if (duplicate)
        throw new FieldException('number', 'Ya registraste esa factura de este proveedor')
    }
    const bill = await finance(ctx, (scope) =>
      new PayablesService(scope).createBill({
        ...data,
        lines: data.lines.map((line) => ({ ...line, amount: toCents(line.amount) })),
        taxAmount: toCents(data.taxAmount ?? 0),
        withholdingIncomeTax: toCents(data.withholdingIncomeTax ?? 0),
        withholdingVat: toCents(data.withholdingVat ?? 0),
        withholdingIca: toCents(data.withholdingIca ?? 0),
      })
    )
    ctx.response.status(201)
    return { data: await presentBill(bill) }
  }

  async cancelBill(ctx: HttpContext) {
    const { reason } = await ctx.request.validateUsing(reasonValidator)
    const bill = await finance(ctx, async (scope) => {
      const found = await Bill.query({ client: scope.trx })
        .where('tenant_id', ctx.tenant.id)
        .where('id', ctx.params.id)
        .forUpdate()
        .firstOrFail()
      return new PayablesService(scope).cancelBill(found, reason)
    })
    return { data: await presentBill(bill) }
  }

  async payments({ tenant, request }: HttpContext) {
    const filters = await request.validateUsing(listVendorPaymentsValidator, { data: request.qs() })
    const query = tenant
      .related('vendorPayments')
      .query()
      .preload('vendor')
      .preload('cashAccount')
      .orderBy('paid_on', 'desc')
      .orderBy('number', 'desc')
    if (filters.vendorId) query.where('vendor_id', filters.vendorId)
    if (filters.status) query.where('status', filters.status)
    const page = await query.paginate(filters.page ?? 1, filters.perPage ?? 25)
    return paginated(page, serializeVendorPayment)
  }

  async showPayment({ tenant, params }: HttpContext) {
    const payment = await tenant
      .related('vendorPayments')
      .query()
      .where('id', params.id)
      .firstOrFail()
    return { data: await presentPayment(payment) }
  }

  async storePayment(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(vendorPaymentValidator)
    const payment = await finance(ctx, (scope) =>
      new PayablesService(scope).pay({
        ...data,
        amount: data.amount ? toCents(data.amount) : undefined,
        allocations: data.allocations?.map((item) => ({
          billId: item.billId,
          amount: toCents(item.amount),
        })),
      })
    )
    ctx.response.status(201)
    return { data: await presentPayment(payment) }
  }

  async reversePayment(ctx: HttpContext) {
    const { reason } = await ctx.request.validateUsing(reasonValidator)
    const payment = await finance(ctx, async (scope) => {
      const found = await VendorPayment.query({ client: scope.trx })
        .where('tenant_id', ctx.tenant.id)
        .where('id', ctx.params.id)
        .forUpdate()
        .firstOrFail()
      return new PayablesService(scope).reversePayment(found, reason)
    })
    return { data: await presentPayment(payment) }
  }
}
