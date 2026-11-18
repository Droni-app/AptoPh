import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import { addMonths, fromCents, periodLabel, toCents } from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import ContributionModuleUnit from '#models/contribution_module_unit'
import RecurringCharge from '#models/recurring_charge'
import type Tenant from '#models/tenant'
import { type FeeInput, FeeCalculator } from '#services/finance/fees'
import { isoDate } from '#services/finance/reports'
import { todayFor } from '#services/finance/support'
import {
  paginated,
  serializeFeeSchedule,
  serializeModule,
  serializeRecurring,
} from '#transformers/finance'
import {
  contributionModuleValidator,
  endRecurringValidator,
  feeScheduleValidator,
  listRecurringValidator,
  recurringChargeValidator,
} from '#validators/finance'
import { finance, normalizePeriod } from '#controllers/finance/helpers'

type FeeBody = Awaited<ReturnType<typeof feeScheduleValidator.validate>>

function feeInput(data: FeeBody): FeeInput {
  return {
    conceptId: data.conceptId,
    method: data.method,
    effectiveFrom: normalizePeriod(data.effectiveFrom),
    monthlyTotal: data.monthlyTotal ? toCents(data.monthlyTotal) : null,
    budgetId: data.budgetId ?? null,
    unitTypes: data.unitTypes,
    mergeAnnexes: data.mergeAnnexes,
    rounding: data.rounding,
    roundingMode: data.roundingMode,
    amountsByType: data.amountsByType
      ? Object.fromEntries(
          Object.entries(data.amountsByType).map(([type, value]) => [type, toCents(value)])
        )
      : undefined,
    modules: data.modules?.map((module) => ({
      moduleId: module.moduleId,
      monthlyTotal: toCents(module.monthlyTotal),
    })),
  }
}

function serializePreview(result: Awaited<ReturnType<typeof FeeCalculator.preview>>) {
  return {
    monthlyTotal: result.monthlyTotal === null ? null : fromCents(result.monthlyTotal),
    budgetBase: result.budgetBase
      ? {
          expenses: fromCents(result.budgetBase.expenses),
          reserve: fromCents(result.budgetBase.reserve),
          otherIncome: fromCents(result.budgetBase.otherIncome),
          monthly: fromCents(result.budgetBase.monthly),
        }
      : null,
    rows: result.rows.map((row) => ({
      ...row,
      current: row.current === null ? null : fromCents(row.current),
      amount: fromCents(row.amount),
    })),
    total: fromCents(result.total),
    currentTotal: fromCents(result.currentTotal),
    roundingDifference: fromCents(result.roundingDifference),
    warnings: result.warnings,
  }
}

async function billedFrom(tenant: Tenant, feeIds: string[], from: string) {
  if (feeIds.length === 0) return null
  return db
    .from('charges')
    .where('tenant_id', tenant.id)
    .whereIn('recurring_charge_id', feeIds)
    .where('period', '>=', from)
    .whereNot('status', 'cancelled')
    .orderBy('period', 'desc')
    .first()
}

/**
 * Fees per unit (tarifas), the fee calculator and contribution modules.
 */
export default class FeesController {
  /** Fees in effect in a month (default: this month) */
  async recurring({ tenant, request }: HttpContext) {
    const filters = await request.validateUsing(listRecurringValidator, { data: request.qs() })
    const month = normalizePeriod(filters.period ?? todayFor(tenant))
    const query = tenant
      .related('recurringCharges')
      .query()
      .where('starts_on', '<=', month)
      .where((q) => q.whereNull('ends_on').orWhere('ends_on', '>=', month))
      .preload('unit', (units) => units.preload('building'))
      .preload('chargeConcept')
      .orderByRaw(
        '(SELECT length(u.code) FROM units u WHERE u.id = recurring_charges.unit_id), (SELECT u.code FROM units u WHERE u.id = recurring_charges.unit_id)'
      )
    if (filters.conceptId) query.where('charge_concept_id', filters.conceptId)
    if (filters.unitId) query.where('unit_id', filters.unitId)
    if (filters.search)
      query.whereHas('unit', (units) => units.whereILike('code', `%${filters.search}%`))
    const totals = await query
      .clone()
      .clearOrder()
      .clearSelect()
      .sum('amount as total')
      .count('* as count')
    const page = await query.paginate(filters.page ?? 1, filters.perPage ?? 100)
    return {
      ...paginated(page, serializeRecurring),
      period: month,
      total: fromCents(toCents(totals[0]?.$extras.total)),
    }
  }

  /** Fee for one unit from a month on; replaces the one in effect */
  async storeRecurring(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(recurringChargeValidator)
    const startsOn = normalizePeriod(data.startsOn)
    const endsOn = data.endsOn ? normalizePeriod(data.endsOn) : null
    if (endsOn && endsOn < startsOn)
      throw new FieldException('endsOn', 'El fin es anterior al inicio')

    const fee = await finance(ctx, async (scope) => {
      const { trx, tenant } = scope
      const unit = await tenant
        .related('units')
        .query()
        .useTransaction(trx)
        .where('id', data.unitId)
        .whereNull('deleted_at')
        .first()
      if (!unit) throw new FieldException('unitId', 'La unidad no existe')
      const concept = await tenant
        .related('chargeConcepts')
        .query()
        .useTransaction(trx)
        .where('id', data.conceptId)
        .first()
      if (!concept) throw new FieldException('conceptId', 'El concepto no existe')
      if (concept.type === 'interest') {
        throw new FieldException('conceptId', 'Los intereses se calculan solos al facturar')
      }

      const overlapping = await RecurringCharge.query({ client: trx })
        .where('tenant_id', tenant.id)
        .where('unit_id', unit.id)
        .where('charge_concept_id', concept.id)
        .where((q) => q.whereNull('ends_on').orWhere('ends_on', '>=', startsOn))
      const billed = await billedFrom(
        tenant,
        overlapping.map((row) => row.id),
        startsOn
      )
      if (billed) {
        const last = isoDate(billed.period)
        throw new FieldException(
          'startsOn',
          `La unidad ya se facturó en ${periodLabel(last)}: la nueva tarifa debe empezar en ${periodLabel(addMonths(last, 1))} o después`
        )
      }
      for (const row of overlapping) {
        if (row.startsOn.toISODate()! >= startsOn) {
          await row.useTransaction(trx).delete()
        } else {
          row.endsOn = DateTime.fromISO(addMonths(startsOn, -1))
          await row.useTransaction(trx).save()
        }
      }
      return RecurringCharge.create(
        {
          tenantId: tenant.id,
          unitId: unit.id,
          chargeConceptId: concept.id,
          amount: fromCents(toCents(data.amount)),
          description: data.description ?? null,
          startsOn: DateTime.fromISO(startsOn),
          endsOn: endsOn ? DateTime.fromISO(endsOn) : null,
          createdById: scope.userId,
        },
        { client: trx }
      )
    })
    await fee.load('unit')
    await fee.load('chargeConcept')
    ctx.response.status(201)
    return { data: serializeRecurring(fee) }
  }

  /** Ends a fee: the last month it is billed */
  async endRecurring(ctx: HttpContext) {
    const { endsOn } = await ctx.request.validateUsing(endRecurringValidator)
    const month = normalizePeriod(endsOn)
    const fee = await ctx.tenant
      .related('recurringCharges')
      .query()
      .where('id', ctx.params.id)
      .firstOrFail()
    if (month < fee.startsOn.toISODate()!) {
      const billed = await billedFrom(ctx.tenant, [fee.id], fee.startsOn.toISODate()!)
      if (billed)
        throw new Exception('La tarifa ya se facturó: elige un mes posterior', { status: 409 })
      await fee.delete()
      return ctx.response.noContent()
    }
    const billed = await billedFrom(ctx.tenant, [fee.id], addMonths(month, 1))
    if (billed) throw new Exception('La tarifa ya se facturó después de ese mes', { status: 409 })
    fee.endsOn = DateTime.fromISO(month)
    await fee.save()
    await fee.load('unit')
    await fee.load('chargeConcept')
    return { data: serializeRecurring(fee) }
  }

  async schedules({ tenant }: HttpContext) {
    const schedules = await tenant
      .related('feeSchedules')
      .query()
      .preload('chargeConcept')
      .orderBy('created_at', 'desc')
      .limit(50)
    return { data: schedules.map(serializeFeeSchedule) }
  }

  async previewSchedule({ tenant, request }: HttpContext) {
    const data = await request.validateUsing(feeScheduleValidator)
    return { data: serializePreview(await FeeCalculator.preview(tenant, feeInput(data))) }
  }

  async applySchedule(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(feeScheduleValidator)
    const result = await finance(ctx, (scope) => FeeCalculator.apply(scope, feeInput(data)))
    await result.schedule.load('chargeConcept')
    ctx.response.status(201)
    return {
      data: { schedule: serializeFeeSchedule(result.schedule), ...serializePreview(result) },
    }
  }

  async modules({ tenant }: HttpContext) {
    const modules = await tenant
      .related('contributionModules')
      .query()
      .preload('units', (units) => units.preload('unit', (unit) => unit.preload('building')))
      .orderBy('name')
    return { data: modules.map(serializeModule) }
  }

  async storeModule(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(contributionModuleValidator)
    const module = await finance(ctx, async ({ trx, tenant }) => {
      const created = await tenant
        .related('contributionModules')
        .create({ name: data.name, description: data.description ?? null }, { client: trx })
      await this.saveUnits(tenant, created.id, data.units, trx)
      return created
    })
    await module.load('units', (units) => units.preload('unit', (unit) => unit.preload('building')))
    ctx.response.status(201)
    return { data: serializeModule(module) }
  }

  async updateModule(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(contributionModuleValidator)
    const module = await ctx.tenant
      .related('contributionModules')
      .query()
      .where('id', ctx.params.id)
      .firstOrFail()
    await finance(ctx, async ({ trx, tenant }) => {
      module.useTransaction(trx)
      module.merge({ name: data.name, description: data.description ?? null })
      await module.save()
      await ContributionModuleUnit.query({ client: trx }).where('module_id', module.id).delete()
      await this.saveUnits(tenant, module.id, data.units, trx)
    })
    await module.load('units', (units) => units.preload('unit', (unit) => unit.preload('building')))
    return { data: serializeModule(module) }
  }

  async destroyModule({ tenant, params, response }: HttpContext) {
    const module = await tenant
      .related('contributionModules')
      .query()
      .where('id', params.id)
      .firstOrFail()
    await module.delete()
    return response.noContent()
  }

  private async saveUnits(
    tenant: Tenant,
    moduleId: string,
    units: Array<{ unitId: string; share: number }>,
    trx: TransactionClientContract
  ) {
    const ids = [...new Set(units.map((unit) => unit.unitId))]
    if (ids.length !== units.length) throw new FieldException('units', 'Hay unidades repetidas')
    const found = await tenant
      .related('units')
      .query()
      .useTransaction(trx)
      .whereIn('id', ids)
      .whereNull('deleted_at')
    if (found.length !== ids.length)
      throw new FieldException('units', 'Alguna de las unidades no existe')
    await ContributionModuleUnit.createMany(
      units.map((unit) => ({
        tenantId: tenant.id,
        moduleId,
        unitId: unit.unitId,
        share: String(unit.share),
      })),
      { client: trx }
    )
  }
}
