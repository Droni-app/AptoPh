import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'
import { Exception } from '@adonisjs/core/exceptions'
import {
  VEHICLE_TYPE_LABELS,
  dayOfPeriod,
  daysInPeriod,
  fromCents,
  parkingSettings,
  percentOf,
  periodLabel,
  proratedCents,
  roundPesos,
  toCents,
} from '@aptoph/shared'
import BillingPeriod from '#models/finance/billing_period'
import Budget from '#models/finance/budget'
import Charge from '#models/finance/charge'
import ChargeConcept from '#models/finance/charge_concept'
import JournalEntry from '#models/finance/journal_entry'
import ParkingAssignment from '#models/property/parking_assignment'
import ParkingSpot from '#models/property/parking_spot'
import RecurringCharge from '#models/finance/recurring_charge'
import type Tenant from '#models/tenants/tenant'
import Unit from '#models/property/unit'
import { ChargeService, type NewCharge } from '#services/finance/charges'
import { PaymentService } from '#services/finance/payments'
import type { FinanceScope } from '#services/finance/scope'
import { iso, settingsOf } from '#services/finance/support'

export type BillingLine = {
  unitId: string
  unitCode: string
  conceptId: string
  conceptName: string
  description: string | null
  /** Cents */
  amount: number
  kind: 'recurring' | 'interest' | 'parking'
}

export type BillingPlan = {
  period: string
  dueOn: string
  discountUntil: string | null
  discountRate: number | null
  interestRate: number | null
  lines: Array<BillingLine & { item: NewCharge }>
  /** Monthly appropriation of the reserve fund, cents (0: none) */
  reserveFund: number
  warnings: string[]
}

/**
 * Monthly billing (facturación). docs/finance.md §3.
 */
export class BillingService {
  constructor(private scope: FinanceScope) {}

  /**
   * What generating `period` would create now. Generation creates exactly this,
   * so the preview and the result never differ.
   */
  static async plan(
    tenant: Tenant,
    period: string,
    client = db.connection()
  ): Promise<BillingPlan> {
    const settings = settingsOf(tenant)
    const dueOn = dayOfPeriod(period, settings.dueDay)
    const discount = settings.earlyDiscount.enabled && settings.earlyDiscount.rate > 0
    const discountUntil = discount ? dayOfPeriod(period, settings.earlyDiscount.day) : null
    const interest = settings.lateInterest.enabled && settings.lateInterest.monthlyRate > 0
    const warnings: string[] = []

    const existingPeriod = await BillingPeriod.query({ client })
      .where('tenant_id', tenant.id)
      .where('period', period)
      .first()

    // 1. Fees of the month (tarifas vigentes)
    const recurring = await RecurringCharge.query({ client })
      .where('recurring_charges.tenant_id', tenant.id)
      .where('starts_on', '<=', period)
      .where((query) => query.whereNull('ends_on').orWhere('ends_on', '>=', period))
      .where('amount', '>', 0)
      .whereHas('unit', (units) => units.whereNull('deleted_at'))
      .whereNotExists((sub) =>
        sub
          .from('charges')
          .whereColumn('charges.tenant_id', 'recurring_charges.tenant_id')
          .whereRaw("charges.idempotency_key = 'rec:' || recurring_charges.id || ':' || ?", [
            period,
          ])
      )
      .preload('unit')
      .preload('chargeConcept')

    const lines: BillingPlan['lines'] = []
    const inactive = new Set<string>()
    for (const fee of recurring) {
      const concept = fee.chargeConcept
      if (!concept.isActive) {
        inactive.add(concept.name)
        continue
      }
      const amount = toCents(fee.amount)
      const item: NewCharge = {
        unitId: fee.unitId,
        concept,
        amount,
        period,
        dueOn,
        description: fee.description,
        sourceType: 'recurring',
        sourceId: fee.id,
        idempotencyKey: `rec:${fee.id}:${period}`,
        billingPeriodId: existingPeriod?.id ?? null,
        recurringChargeId: fee.id,
        discountUntil: discount && concept.allowsEarlyDiscount ? discountUntil : null,
        discountAmount:
          discount && concept.allowsEarlyDiscount
            ? roundPesos(percentOf(amount, settings.earlyDiscount.rate), 1)
            : 0,
      }
      lines.push({
        unitId: fee.unitId,
        unitCode: fee.unit.code,
        conceptId: concept.id,
        conceptName: concept.name,
        description: fee.description,
        amount,
        kind: 'recurring',
        item,
      })
    }
    for (const name of inactive) warnings.push(`El concepto «${name}» está inactivo: no se factura`)

    // 2. Parking spots (docs/parking.md): communal ones held during the month,
    //    prorated by day, and private ones when they have a monthly rate
    await BillingService.planParking(tenant, period, client, {
      dueOn,
      billingPeriodId: existingPeriod?.id ?? null,
      lines,
      warnings,
    })

    // 3. Late interest on capital overdue before the month starts
    if (interest) {
      const interestConcept = await ChargeConcept.query({ client })
        .where('tenant_id', tenant.id)
        .where('code', 'interest')
        .first()
      if (!interestConcept?.isActive) {
        warnings.push('El concepto de intereses de mora está inactivo: no se calculan intereses')
      } else {
        const overdue = await Charge.query({ client })
          .where('charges.tenant_id', tenant.id)
          .whereIn('status', ['pending', 'partially_paid'])
          .where('balance', '>', 0)
          .where('due_on', '<', period)
          .whereHas('chargeConcept', (concepts) => concepts.where('accrues_interest', true))
          .whereHas('unit', (units) => units.whereNull('deleted_at'))
          .whereNotExists((sub) =>
            sub
              .from('charges as i')
              .whereColumn('i.tenant_id', 'charges.tenant_id')
              .whereRaw("i.idempotency_key = 'int:' || charges.id || ':' || ?", [period])
          )
          .preload('unit')
          .preload('chargeConcept')
        for (const charge of overdue) {
          const amount = roundPesos(
            percentOf(toCents(charge.balance), settings.lateInterest.monthlyRate),
            1
          )
          if (amount < 100) continue
          const description = `Sobre ${charge.chargeConcept.name.toLowerCase()} de ${periodLabel(iso(charge.period)!)} (saldo $${Math.round(toCents(charge.balance) / 100).toLocaleString('es-CO')})`
          lines.push({
            unitId: charge.unitId,
            unitCode: charge.unit.code,
            conceptId: interestConcept.id,
            conceptName: interestConcept.name,
            description,
            amount,
            kind: 'interest',
            item: {
              unitId: charge.unitId,
              concept: interestConcept,
              amount,
              period,
              dueOn,
              description,
              sourceType: 'interest',
              sourceId: charge.id,
              idempotencyKey: `int:${charge.id}:${period}`,
              billingPeriodId: existingPeriod?.id ?? null,
            },
          })
        }
      }
    }

    // 4. Reserve fund appropriation of the month (approved budget of the year)
    let reserveFund = 0
    const budget = await Budget.query({ client })
      .where('tenant_id', tenant.id)
      .where('year', Number(period.slice(0, 4)))
      .where('status', 'approved')
      .preload('items', (items) => items.preload('account'))
      .first()
    if (budget && Number(budget.reserveFundRate) > 0) {
      const posted = existingPeriod
        ? await JournalEntry.query({ client })
            .where('tenant_id', tenant.id)
            .where('source_type', 'billing_period_reserve')
            .where('source_id', existingPeriod.id)
            .whereNull('reversed_by_entry_id')
            .first()
        : null
      if (!posted) {
        const expenses = budget.items
          .filter(
            (item) =>
              item.account.class === 'expense' && item.account.systemKey !== 'expense.reserve_fund'
          )
          .reduce((sum, item) => sum + toCents(item.annualAmount), 0)
        reserveFund = roundPesos(percentOf(expenses, Number(budget.reserveFundRate)) / 12, 1)
      }
    }

    // Units that would get nothing this month
    const billed = new Set(lines.map((line) => line.unitId))
    if (!existingPeriod?.generatedAt) {
      const unbilled = await Unit.query({ client })
        .where('tenant_id', tenant.id)
        .whereNull('deleted_at')
        .whereNull('parent_unit_id')
        .whereIn('type', ['apartment', 'house', 'commercial'])
        .whereNotIn('id', [...billed])
        .whereNotExists((sub) =>
          sub
            .from('recurring_charges as r')
            .whereColumn('r.unit_id', 'units.id')
            .where('r.starts_on', '<=', period)
            .where((q) => q.whereNull('r.ends_on').orWhere('r.ends_on', '>=', period))
        )
        .orderByRaw('length(code), code')
        .limit(11)
      if (unbilled.length) {
        const codes = unbilled.slice(0, 10).map((unit) => unit.code)
        warnings.push(
          `Unidades sin tarifa este mes: ${codes.join(', ')}${unbilled.length > 10 ? '…' : ''}. Configúralas en Tarifas.`
        )
      }
    }

    lines.sort(
      (a, b) =>
        a.unitCode.length - b.unitCode.length ||
        a.unitCode.localeCompare(b.unitCode) ||
        a.kind.localeCompare(b.kind)
    )

    return {
      period,
      dueOn,
      discountUntil,
      discountRate: discount ? settings.earlyDiscount.rate : null,
      interestRate: interest ? settings.lateInterest.monthlyRate : null,
      lines,
      reserveFund,
      warnings,
    }
  }

  private static async planParking(
    tenant: Tenant,
    period: string,
    client: QueryClientContract,
    target: {
      dueOn: string
      billingPeriodId: string | null
      lines: BillingPlan['lines']
      warnings: string[]
    }
  ) {
    const parking = parkingSettings((tenant.settings ?? {}).parking)
    const { monthDays } = daysInPeriod(period, period, null)
    const monthEnd = `${period.slice(0, 8)}${String(monthDays).padStart(2, '0')}`
    /** Not billed yet for the period: `<prefix>:<id>:<period>` */
    const notBilled = (prefix: string, table: string) =>
      [
        `NOT EXISTS (SELECT 1 FROM charges WHERE charges.tenant_id = ${table}.tenant_id AND charges.idempotency_key = '${prefix}:' || ${table}.id || ':' || ?)`,
        [period],
      ] as [string, string[]]

    const assignments = await ParkingAssignment.query({ client })
      .where('parking_assignments.tenant_id', tenant.id)
      .whereIn('status', ['scheduled', 'active', 'ended', 'cancelled'])
      .where('starts_on', '<=', monthEnd)
      .whereRaw('coalesce(ended_on, ends_on, ?::date) >= ?::date', [monthEnd, period])
      .where('monthly_rate', '>', 0)
      .whereHas('unit', (units) => units.whereNull('deleted_at'))
      .whereRaw(...notBilled('park', 'parking_assignments'))
      .preload('unit')
      .preload('spot')
    const privateSpots = Object.values(parking.rates).some((rate) => rate.private > 0)
      ? await ParkingSpot.query({ client })
          .where('parking_spots.tenant_id', tenant.id)
          .whereNull('deleted_at')
          .where('ownership', 'private')
          .where('is_active', true)
          .whereIn(
            'vehicle_type',
            Object.entries(parking.rates)
              .filter(([, rate]) => rate.private > 0)
              .map(([type]) => type)
          )
          .whereHas('ownerUnit', (units) => units.whereNull('deleted_at'))
          .whereRaw(...notBilled('pspot', 'parking_spots'))
          .preload('ownerUnit')
      : []
    if (!assignments.length && !privateSpots.length) return

    const concept = await ChargeConcept.query({ client })
      .where('tenant_id', tenant.id)
      .where('code', 'parking')
      .first()
    if (!concept?.isActive) {
      target.warnings.push('El concepto de parqueaderos está inactivo: no se facturan parqueaderos')
      return
    }
    const line = (input: {
      unitId: string
      unitCode: string
      amount: number
      description: string
      sourceId: string
      key: string
    }) =>
      target.lines.push({
        unitId: input.unitId,
        unitCode: input.unitCode,
        conceptId: concept.id,
        conceptName: concept.name,
        description: input.description,
        amount: input.amount,
        kind: 'parking',
        item: {
          unitId: input.unitId,
          concept,
          amount: input.amount,
          period,
          dueOn: target.dueOn,
          description: input.description,
          sourceType: 'parking',
          sourceId: input.sourceId,
          idempotencyKey: input.key,
          billingPeriodId: target.billingPeriodId,
        },
      })

    for (const assignment of assignments) {
      const from = assignment.startsOn.toISODate()!
      const to = iso(assignment.endedOn ?? assignment.endsOn)
      const amount = proratedCents(toCents(assignment.monthlyRate), period, from, to)
      if (amount <= 0) continue
      const { days } = daysInPeriod(period, from, to)
      const type = VEHICLE_TYPE_LABELS[assignment.spot.vehicleType].toLowerCase()
      line({
        unitId: assignment.unitId,
        unitCode: assignment.unit.code,
        amount,
        description: `Parqueadero comunal ${assignment.spot.code} · ${type}${days < monthDays ? ` (${days} de ${monthDays} días)` : ''}`,
        sourceId: assignment.id,
        key: `park:${assignment.id}:${period}`,
      })
    }
    for (const spot of privateSpots) {
      const amount = toCents(parking.rates[spot.vehicleType].private.toFixed(2))
      line({
        unitId: spot.ownerUnitId!,
        unitCode: spot.ownerUnit.code,
        amount,
        description: `Parqueadero propio ${spot.code} · ${VEHICLE_TYPE_LABELS[spot.vehicleType].toLowerCase()}`,
        sourceId: spot.id,
        key: `pspot:${spot.id}:${period}`,
      })
    }
  }

  /**
   * Generates the month: charges, accrual voucher, reserve fund and credit
   * application. Idempotent: running it again only adds what is missing.
   */
  async generate(period: string) {
    const { trx, tenant, userId, ledger } = this.scope
    let billingPeriod = await BillingPeriod.query({ client: trx })
      .where('tenant_id', tenant.id)
      .where('period', period)
      .forUpdate()
      .first()
    if (billingPeriod?.status === 'closed') {
      throw new Exception(`El periodo de ${periodLabel(period)} está cerrado`, { status: 409 })
    }

    const plan = await BillingService.plan(tenant, period, trx)
    billingPeriod ??= await BillingPeriod.create(
      {
        tenantId: tenant.id,
        period: DateTime.fromISO(period),
        dueOn: DateTime.fromISO(plan.dueOn),
        discountUntil: plan.discountUntil ? DateTime.fromISO(plan.discountUntil) : null,
        discountRate: plan.discountRate === null ? null : String(plan.discountRate),
        interestRate: plan.interestRate === null ? null : String(plan.interestRate),
        status: 'open',
        chargesCount: 0,
        totalAmount: '0.00',
      },
      { client: trx }
    )

    const charges = new ChargeService(this.scope)
    const created = await charges.insert(
      plan.lines.map((line) => ({ ...line.item, billingPeriodId: billingPeriod!.id }))
    )
    const date = charges.postingDate(period)
    await charges.post(created, {
      date,
      type: 'billing',
      description: `Facturación de ${periodLabel(period)}`,
      sourceType: 'billing_period',
      sourceId: billingPeriod.id,
    })

    if (plan.reserveFund > 0) {
      await ledger.post({
        date,
        type: 'reserve_fund',
        description: `Fondo de imprevistos · ${periodLabel(period)}`,
        sourceType: 'billing_period_reserve',
        sourceId: billingPeriod.id,
        userId,
        lines: [
          {
            accountId: this.scope.accounts.key('expense.reserve_fund').id,
            debit: plan.reserveFund,
          },
          {
            accountId: this.scope.accounts.key('equity.reserve_fund').id,
            credit: plan.reserveFund,
          },
        ],
      })
    }

    await new PaymentService(this.scope).applyCredits(
      created.map((charge) => charge.unitId),
      date
    )

    const added = created.reduce((sum, charge) => sum + toCents(charge.amount), 0)
    billingPeriod.chargesCount += created.length
    billingPeriod.totalAmount = fromCents(toCents(billingPeriod.totalAmount) + added)
    billingPeriod.generatedAt = DateTime.now()
    billingPeriod.generatedById = userId
    await billingPeriod.useTransaction(trx).save()

    return {
      period: billingPeriod,
      created: created.length,
      /** For the notices to the units, after the transaction */
      charges: created.map((charge) => ({
        unitId: charge.unitId,
        amount: charge.amount,
        dueOn: charge.dueOn.toISODate()!,
      })),
      total: added,
      reserveFund: plan.reserveFund,
      warnings: plan.warnings,
    }
  }

  async close(billingPeriod: BillingPeriod) {
    billingPeriod.status = 'closed'
    billingPeriod.closedAt = DateTime.now()
    billingPeriod.closedById = this.scope.userId
    await billingPeriod.useTransaction(this.scope.trx).save()
    return billingPeriod
  }

  async reopen(billingPeriod: BillingPeriod) {
    billingPeriod.status = 'open'
    billingPeriod.closedAt = null
    billingPeriod.closedById = null
    await billingPeriod.useTransaction(this.scope.trx).save()
    return billingPeriod
  }
}
