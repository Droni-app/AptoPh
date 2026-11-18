import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import {
  type FeeMethod,
  type RoundingMode,
  type UnitType,
  addMonths,
  fromCents,
  periodLabel,
  roundPesos,
  splitByWeights,
  toCents,
} from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import Budget from '#models/budget'
import ChargeConcept from '#models/charge_concept'
import ContributionModuleUnit from '#models/contribution_module_unit'
import FeeSchedule from '#models/fee_schedule'
import RecurringCharge from '#models/recurring_charge'
import type Tenant from '#models/tenant'
import Unit from '#models/unit'
import type { FinanceScope } from '#services/finance/scope'

export type FeeInput = {
  conceptId: string
  method: FeeMethod
  effectiveFrom: string
  /** Cents to distribute each month (not for fixed_by_type / module) */
  monthlyTotal?: number | null
  /** Take the monthly total from this approved budget */
  budgetId?: string | null
  unitTypes?: UnitType[]
  /** Parking spots and storage rooms add their part to their main unit */
  mergeAnnexes?: boolean
  rounding: number
  roundingMode: RoundingMode
  /** Cents per unit type, for fixed_by_type */
  amountsByType?: Partial<Record<UnitType, number>>
  /** Monthly total of each contribution module, for module */
  modules?: Array<{ moduleId: string; monthlyTotal: number }>
}

export type FeeRow = {
  unitId: string
  code: string
  type: string
  building: string | null
  /** Coefficient, area or module share used */
  basis: string | null
  includes: string[]
  /** Cents; current fee of the concept in effect that month (null: none) */
  current: number | null
  /** Cents */
  amount: number
}

/**
 * Monthly base taken from a budget: expenses plus the reserve fund, minus the
 * other income the budget expects (parking, rentals…). docs/finance.md §2.
 */
export async function budgetMonthlyBase(budget: Budget) {
  await budget.load('items', (items) => items.preload('account'))
  let expenses = 0
  let otherIncome = 0
  for (const item of budget.items) {
    const amount = toCents(item.annualAmount)
    if (item.account.class === 'expense' && item.account.systemKey !== 'expense.reserve_fund') {
      expenses += amount
    } else if (
      item.account.class === 'income' &&
      !['income.ordinary_fee', 'income.interest'].includes(item.account.systemKey ?? '')
    ) {
      otherIncome += amount
    }
  }
  const reserve = Math.round((expenses * Number(budget.reserveFundRate)) / 100)
  return {
    expenses,
    reserve,
    otherIncome,
    monthly: Math.max(0, Math.round((expenses + reserve - otherIncome) / 12)),
  }
}

/**
 * Fee calculator: fills the per-unit fees (tarifas) of a concept.
 */
export class FeeCalculator {
  static async preview(tenant: Tenant, input: FeeInput, client = db.connection()) {
    const concept = await ChargeConcept.query({ client })
      .where('tenant_id', tenant.id)
      .where('id', input.conceptId)
      .first()
    if (!concept) throw new FieldException('conceptId', 'El concepto de cobro no existe')

    let monthlyTotal = input.monthlyTotal ?? null
    let budgetBase = null
    if (input.budgetId) {
      const budget = await Budget.query({ client })
        .where('tenant_id', tenant.id)
        .where('id', input.budgetId)
        .first()
      if (!budget) throw new FieldException('budgetId', 'El presupuesto no existe')
      budgetBase = await budgetMonthlyBase(budget)
      monthlyTotal = budgetBase.monthly
    }
    if (['coefficient', 'area', 'equal'].includes(input.method) && !monthlyTotal) {
      throw new FieldException('monthlyTotal', 'Indica el valor mensual a repartir')
    }

    const units = await Unit.query({ client })
      .where('tenant_id', tenant.id)
      .whereNull('deleted_at')
      .preload('building')
      .orderByRaw('length(code), code')
    const byId = new Map(units.map((unit) => [unit.id, unit]))
    const included = input.unitTypes?.length
      ? units.filter((unit) => input.unitTypes!.includes(unit.type as UnitType))
      : units

    // Exact share of each unit, in cents (fractions allowed before rounding)
    const exact = new Map<string, number>()
    const basis = new Map<string, string | null>()
    const warnings: string[] = []

    if (input.method === 'module') {
      if (!input.modules?.length) {
        throw new FieldException('modules', 'Indica el valor mensual de cada módulo')
      }
      for (const module of input.modules) {
        const members = await ContributionModuleUnit.query({ client })
          .where('tenant_id', tenant.id)
          .where('module_id', module.moduleId)
        if (members.length === 0) {
          throw new FieldException('modules', 'Uno de los módulos no tiene unidades')
        }
        const parts = splitByWeights(
          module.monthlyTotal * 1000,
          members.map((member) => Number(member.share))
        )
        members.forEach((member, i) => {
          if (!byId.has(member.unitId)) return
          exact.set(member.unitId, (exact.get(member.unitId) ?? 0) + parts[i]! / 1000)
          const previous = basis.get(member.unitId)
          basis.set(member.unitId, previous ? `${previous} + ${member.share}` : member.share)
        })
      }
      monthlyTotal = input.modules.reduce((sum, module) => sum + module.monthlyTotal, 0)
    } else if (input.method === 'fixed_by_type') {
      for (const unit of included) {
        const amount = input.amountsByType?.[unit.type as UnitType]
        if (amount === undefined) continue
        exact.set(unit.id, amount)
        basis.set(unit.id, null)
      }
    } else {
      const weightOf = (unit: Unit) =>
        input.method === 'coefficient'
          ? Number(unit.ownershipCoefficient)
          : input.method === 'area'
            ? Number(unit.privateArea ?? 0)
            : 1
      const weighted = included.filter((unit) => weightOf(unit) > 0)
      const missing = included.length - weighted.length
      if (missing > 0) {
        warnings.push(
          input.method === 'area'
            ? `${missing} unidades no tienen área privada y no pagan: complétala en Unidades`
            : `${missing} unidades tienen coeficiente 0 y no pagan`
        )
      }
      const sum = weighted.reduce((acc, unit) => acc + weightOf(unit), 0)
      for (const unit of weighted) {
        exact.set(unit.id, (monthlyTotal! * weightOf(unit)) / sum)
        basis.set(
          unit.id,
          input.method === 'coefficient'
            ? unit.ownershipCoefficient
            : input.method === 'area'
              ? `${unit.privateArea} m²`
              : null
        )
      }
    }

    // Annexes pay through their main unit
    const includes = new Map<string, string[]>()
    if (input.mergeAnnexes) {
      for (const [unitId, amount] of [...exact]) {
        const unit = byId.get(unitId)!
        if (!unit.parentUnitId || !byId.has(unit.parentUnitId)) continue
        exact.delete(unitId)
        exact.set(unit.parentUnitId, (exact.get(unit.parentUnitId) ?? 0) + amount)
        includes.set(unit.parentUnitId, [...(includes.get(unit.parentUnitId) ?? []), unit.code])
      }
    }

    // Current fees of the concept that month
    const current = await RecurringCharge.query({ client })
      .where('tenant_id', tenant.id)
      .where('charge_concept_id', concept.id)
      .where('starts_on', '<=', input.effectiveFrom)
      .where((query) => query.whereNull('ends_on').orWhere('ends_on', '>=', input.effectiveFrom))
    const currentByUnit = new Map<string, number>()
    for (const fee of current) {
      currentByUnit.set(fee.unitId, (currentByUnit.get(fee.unitId) ?? 0) + toCents(fee.amount))
    }

    const rows: FeeRow[] = []
    for (const unit of units) {
      const value = exact.get(unit.id)
      const before = currentByUnit.get(unit.id) ?? null
      if (value === undefined && before === null) continue
      rows.push({
        unitId: unit.id,
        code: unit.code,
        type: unit.type,
        building: unit.building?.name ?? null,
        basis: basis.get(unit.id) ?? null,
        includes: includes.get(unit.id) ?? [],
        current: before,
        amount:
          value === undefined
            ? 0
            : roundPesos(Math.round(value), input.rounding, input.roundingMode),
      })
    }

    const total = rows.reduce((sum, row) => sum + row.amount, 0)
    const currentTotal = rows.reduce((sum, row) => sum + (row.current ?? 0), 0)
    return {
      concept,
      monthlyTotal,
      budgetBase,
      rows,
      total,
      currentTotal,
      /** What rounding adds (or takes) versus the target */
      roundingDifference: monthlyTotal ? total - monthlyTotal : 0,
      warnings,
    }
  }

  /**
   * Replaces every fee of the concept from `effectiveFrom`: fees in effect end
   * the month before, future ones are replaced, and the new ones start.
   */
  static async apply(scope: FinanceScope, input: FeeInput) {
    const { trx, tenant, userId } = scope
    const result = await FeeCalculator.preview(tenant, input, trx)

    // A month already billed with this concept keeps its fees
    const billed = await trx
      .from('charges')
      .where('tenant_id', tenant.id)
      .where('charge_concept_id', input.conceptId)
      .where('source_type', 'recurring')
      .where('period', '>=', input.effectiveFrom)
      .whereNot('status', 'cancelled')
      .orderBy('period', 'desc')
      .first()
    if (billed) {
      const last =
        billed.period instanceof Date
          ? DateTime.fromJSDate(billed.period).toISODate()!
          : String(billed.period).slice(0, 10)
      throw new FieldException(
        'effectiveFrom',
        `Ya se facturó ${periodLabel(last)} con este concepto: la nueva tarifa debe empezar en ${periodLabel(addMonths(last, 1))} o después`
      )
    }
    const previousMonth = addMonths(input.effectiveFrom, -1)

    const schedule = await FeeSchedule.create(
      {
        tenantId: tenant.id,
        chargeConceptId: result.concept.id,
        method: input.method,
        monthlyTotal: result.monthlyTotal === null ? null : fromCents(result.monthlyTotal),
        parameters: {
          unitTypes: input.unitTypes ?? null,
          mergeAnnexes: Boolean(input.mergeAnnexes),
          rounding: input.rounding,
          roundingMode: input.roundingMode,
          amountsByType: input.amountsByType
            ? Object.fromEntries(
                Object.entries(input.amountsByType).map(([type, cents]) => [
                  type,
                  fromCents(cents!),
                ])
              )
            : null,
          modules:
            input.modules?.map((module) => ({
              moduleId: module.moduleId,
              monthlyTotal: fromCents(module.monthlyTotal),
            })) ?? null,
        },
        effectiveFrom: DateTime.fromISO(input.effectiveFrom),
        budgetId: input.budgetId ?? null,
        totalAmount: fromCents(result.total),
        unitsCount: result.rows.filter((row) => row.amount > 0).length,
        createdById: userId,
      },
      { client: trx }
    )

    // Future fees of the concept are replaced; current ones end last month
    await RecurringCharge.query({ client: trx })
      .where('tenant_id', tenant.id)
      .where('charge_concept_id', result.concept.id)
      .where('starts_on', '>=', input.effectiveFrom)
      .whereNotExists((sub) =>
        sub.from('charges').whereColumn('charges.recurring_charge_id', 'recurring_charges.id')
      )
      .delete()
    await RecurringCharge.query({ client: trx })
      .where('tenant_id', tenant.id)
      .where('charge_concept_id', result.concept.id)
      .where('starts_on', '<', input.effectiveFrom)
      .where((query) => query.whereNull('ends_on').orWhere('ends_on', '>=', input.effectiveFrom))
      .update({ endsOn: previousMonth, updatedAt: DateTime.now().toSQL() })
    // Fees already billed from that month on keep their history but stop
    await RecurringCharge.query({ client: trx })
      .where('tenant_id', tenant.id)
      .where('charge_concept_id', result.concept.id)
      .where('starts_on', '>=', input.effectiveFrom)
      .update({ endsOn: db.raw('starts_on'), updatedAt: DateTime.now().toSQL() })

    const rows = result.rows.filter((row) => row.amount > 0)
    if (rows.length) {
      await RecurringCharge.createMany(
        rows.map((row) => ({
          tenantId: tenant.id,
          unitId: row.unitId,
          chargeConceptId: result.concept.id,
          amount: fromCents(row.amount),
          description: row.includes.length ? `Incluye ${row.includes.join(', ')}` : null,
          startsOn: DateTime.fromISO(input.effectiveFrom),
          endsOn: null,
          feeScheduleId: schedule.id,
          createdById: userId,
        })),
        { client: trx }
      )
    }
    return { schedule, ...result }
  }
}
