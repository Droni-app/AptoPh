import { randomBytes } from 'node:crypto'
import { Exception } from '@adonisjs/core/exceptions'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import {
  EMAIL_PACK_PRICE,
  EMAIL_PACK_SIZE,
  PAST_DUE_GRACE_DAYS,
  PAY_AHEAD_DAYS,
  PLAN,
  RENEWAL_CHARGE_HOURS_BEFORE,
  RENEWAL_RETRY_DAYS,
  quote,
  type BillingChargeStatus,
  type PaymentMethodInput,
  type PaymentMethodType,
} from '@aptoph/shared'
import wompiConfig from '#config/wompi'
import FieldException from '#exceptions/field_exception'
import BillingCharge from '#models/billing/billing_charge'
import BillingPaymentMethod from '#models/billing/billing_payment_method'
import Subscription from '#models/billing/subscription'
import Tenant from '#models/tenants/tenant'
import type User from '#models/auth/user'
import { appUrl } from '#services/app_urls'
import { EmailQuotaService, quotaPeriod } from '#services/announcements/email_quota'
import { checkoutUrl, wompi, WompiError, type WompiTransaction } from '#services/billing/wompi'
import { notifyChargeResult } from '#services/billing/billing_notifications'

/**
 * Payments of a conjunto to AptoPH with Wompi (docs/billing.md).
 *
 * Invariants:
 *  - amounts are always computed here, never taken from the client
 *  - a charge's result comes from Wompi (event or query), checked against its
 *    reference, amount and currency, and its effect is applied exactly once
 *  - one charge of the plan in process at a time
 */

const environment = () => wompiConfig.environment as 'sandbox' | 'production'

/** 409 / 422 / 503 with a message for the person */
function fail(message: string, status = 409): never {
  throw new Exception(message, { status, code: 'E_BILLING' })
}

/** Public demo conjunto (database/seeders/demo_seeder.ts): visitors never pay anything */
const DEMO_SLUG = 'demo'

export function assertPaymentsEnabled(tenant: Tenant) {
  if (!wompiConfig.configured) fail('Los pagos en línea no están disponibles en este momento.', 503)
  if (tenant.slug === DEMO_SLUG) fail('El conjunto de demostración no tiene pagos.', 403)
}

/** APH-PLAN-261119-9F2C41A7D3 */
function newReference(kind: 'PLAN' | 'MAIL') {
  return `APH-${kind}-${DateTime.utc().toFormat('yyMMdd')}-${randomBytes(5).toString('hex').toUpperCase()}`
}

const dateLabel = (date: DateTime) => date.setLocale('es').toFormat("d 'de' LLL yyyy")

/** Card brand from the first digits (display only) */
function brandOf(bin: string) {
  if (/^4/.test(bin)) return 'VISA'
  if (/^(5[1-5]|2[2-7])/.test(bin)) return 'MASTERCARD'
  if (/^3[47]/.test(bin)) return 'AMEX'
  if (/^3(0|6|8)/.test(bin)) return 'DINERS'
  return 'Tarjeta'
}

/** Display data of a Wompi payment source */
function displayOf(type: PaymentMethodType, data: Record<string, unknown>) {
  const text = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : '')
  if (type === 'CARD') {
    const lastFour = text('last_four').slice(-4) || null
    const brand = brandOf(text('bin'))
    return { brand, lastFour, label: `${brand} ·· ${lastFour ?? '····'}` }
  }
  const digits = (text('phone_number') || text('bank_account_last_four') || text('number')).replace(
    /\D/g,
    ''
  )
  const lastFour = digits ? digits.slice(-4) : null
  const name = type === 'NEQUI' ? 'Nequi' : type === 'DAVIPLATA' ? 'DaviPlata' : 'Bancolombia'
  return { brand: name, lastFour, label: lastFour ? `${name} ·· ${lastFour}` : name }
}

/** Units used to quote: the registered ones or, before loading the census, the declared ones */
export async function billableUnits(tenant: Tenant, subscription: Subscription) {
  const row = await db
    .from('units')
    .where('tenant_id', tenant.id)
    .whereNull('deleted_at')
    .count('* as total')
    .first()
  const registered = Number(row?.total ?? 0)
  return registered > 0 ? registered : subscription.declaredUnits
}

/** Wompi's transaction status as a charge status */
function statusOf(transaction: WompiTransaction): BillingChargeStatus {
  switch (transaction.status) {
    case 'APPROVED':
      return 'approved'
    case 'DECLINED':
      return 'declined'
    case 'VOIDED':
      return 'voided'
    case 'ERROR':
      return 'error'
    default:
      return 'pending'
  }
}

export class BillingService {
  constructor(private tenant: Tenant) {}

  activeMethod(client?: TransactionClientContract) {
    return BillingPaymentMethod.query({ client })
      .where('tenant_id', this.tenant.id)
      .where('environment', environment())
      .where('status', 'active')
      .preload('createdBy')
      .first()
  }

  subscription(client?: TransactionClientContract) {
    return Subscription.query({ client }).where('tenant_id', this.tenant.id).first()
  }

  charges(limit = 30) {
    return BillingCharge.query()
      .where('tenant_id', this.tenant.id)
      .where('environment', environment())
      .orderBy('created_at', 'desc')
      .limit(limit)
  }

  findCharge(id: string) {
    return BillingCharge.query().where('tenant_id', this.tenant.id).where('id', id).firstOrFail()
  }

  /**
   * Saves a payment method: Wompi turns the token into a payment source with the
   * contracts the person accepted. Replaces the previous one.
   */
  async savePaymentMethod(input: PaymentMethodInput, user: User) {
    assertPaymentsEnabled(this.tenant)
    let source
    try {
      source = await wompi.api.createPaymentSource({
        type: input.type,
        token: input.token,
        customerEmail: user.email,
        acceptanceToken: input.acceptanceToken,
        personalAuthToken: input.personalAuthToken,
      })
    } catch (error) {
      if (error instanceof WompiError && error.status < 500)
        throw new FieldException('token', error.message)
      throw error
    }
    if (source.status !== 'AVAILABLE') {
      throw new FieldException('token', 'Wompi no aprobó este medio de pago. Intenta con otro.')
    }
    const contracts = await wompi.api.acceptance()
    const display = displayOf(input.type, source.publicData)

    const previous = await db.transaction(async (trx) => {
      const current = await this.activeMethod(trx)
      if (current) {
        current.useTransaction(trx)
        current.merge({ status: 'removed', removedAt: DateTime.now(), removedById: user.id })
        await current.save()
      }
      await BillingPaymentMethod.create(
        {
          tenantId: this.tenant.id,
          environment: environment(),
          wompiPaymentSourceId: source.id,
          type: input.type,
          label: display.label,
          brand: display.brand,
          lastFour: display.lastFour,
          expMonth: input.type === 'CARD' ? (input.expMonth ?? null) : null,
          expYear: input.type === 'CARD' ? (input.expYear ?? null) : null,
          customerEmail: user.email,
          status: 'active',
          policyUrl: contracts.policyUrl,
          personalDataUrl: contracts.personalDataUrl,
          createdById: user.id,
        },
        { client: trx }
      )

      // Behind on the renewal: try again right away with the new method
      const subscription = await this.subscription(trx)
      if (subscription?.autoRenew && subscription.status === 'past_due') {
        subscription.useTransaction(trx)
        subscription.nextRenewalAt = DateTime.now()
        await subscription.save()
      }
      return current
    })
    if (previous) await voidQuietly(previous)
    return (await this.activeMethod())!
  }

  /** Removes the payment method; the plan stops renewing by itself */
  async removePaymentMethod(user: User) {
    const method = await this.activeMethod()
    if (!method) fail('No hay un medio de pago guardado.', 404)
    await db.transaction(async (trx) => {
      method.useTransaction(trx)
      method.merge({ status: 'removed', removedAt: DateTime.now(), removedById: user.id })
      await method.save()
      const subscription = await this.subscription(trx)
      if (subscription) {
        subscription.useTransaction(trx)
        subscription.merge({ autoRenew: false, nextRenewalAt: null })
        await subscription.save()
      }
    })
    await voidQuietly(method)
  }

  /** Turns the automatic renewal on or off (off: the plan lasts until the paid period ends) */
  async setAutoRenew(enabled: boolean) {
    const subscription = await this.subscription()
    if (!subscription) fail('Este conjunto no tiene un plan con renovación.', 404)
    if (enabled) {
      if (!(await this.activeMethod())) fail('Agrega un medio de pago para renovar el plan.', 422)
      if (
        !['active', 'past_due'].includes(subscription.status) ||
        !subscription.currentPeriodEndsAt
      ) {
        fail('Activa el plan primero.', 422)
      }
      subscription.autoRenew = true
      subscription.nextRenewalAt = DateTime.max(
        DateTime.now(),
        subscription.currentPeriodEndsAt.minus({ hours: RENEWAL_CHARGE_HOURS_BEFORE })
      )
      subscription.cancelledAt = null
    } else {
      subscription.merge({ autoRenew: false, nextRenewalAt: null, cancelledAt: DateTime.now() })
    }
    await subscription.save()
    return subscription
  }

  /**
   * Pays the plan now: activates it (trial, expired), pays an overdue period or
   * the next one (from PAY_AHEAD_DAYS before the end). With a saved method it
   * is charged right away; without one (manual payment: PSE from any bank,
   * card or wallet) it is paid in Wompi's checkout. The new period starts when
   * the paid one ends while it is still recent (no free days); otherwise today.
   * One month at a time.
   */
  async paySubscription(user: User) {
    assertPaymentsEnabled(this.tenant)
    await this.releaseAbandonedCheckout()
    const { charge, method } = await db.transaction(async (trx) => {
      const subscription = await Subscription.query({ client: trx })
        .where('tenant_id', this.tenant.id)
        .forUpdate()
        .first()
      if (!subscription)
        fail('Este conjunto tiene un acuerdo administrado directamente con AptoPH.', 404)
      const paymentMethod = await this.activeMethod(trx)
      await this.assertNoPendingPlanCharge(trx)

      const now = DateTime.now()
      const end = subscription.currentPeriodEndsAt
      const paid = ['active', 'past_due'].includes(subscription.status) && end
      if (subscription.status === 'active' && end && end > now.plus({ days: PAY_AHEAD_DAYS })) {
        fail(
          `Tu plan ya está pagado hasta el ${dateLabel(end)}. Puedes pagar el siguiente periodo desde ${PAY_AHEAD_DAYS} días antes.`
        )
      }
      const from = paid && end.plus({ days: PAST_DUE_GRACE_DAYS }) > now ? end : now
      const created = await this.createPlanCharge(trx, subscription, {
        from,
        method: paymentMethod,
        userId: user.id,
        automatic: false,
      })
      return { charge: created, method: paymentMethod }
    })
    if (method) {
      await submitCharge(charge, method)
      return { charge, checkoutUrl: null }
    }
    return { charge, checkoutUrl: this.checkoutOf(charge, user) }
  }

  /** Link to pay a charge in Wompi's checkout; it comes back to /plan?pago=<id> */
  private checkoutOf(charge: BillingCharge, user: User) {
    return checkoutUrl({
      reference: charge.reference,
      amountInCents: charge.amountCents,
      customerEmail: user.email,
      redirectUrl: `${appUrl('backoffice')}/plan?pago=${charge.id}`,
    })
  }

  /**
   * A checkout of the plan opened and left without paying (no transaction in
   * Wompi) does not block a new attempt: it ends as "not completed". If it is
   * paid later anyway, its event reopens and applies it (reopenCheckout).
   */
  private async releaseAbandonedCheckout() {
    const pending = await BillingCharge.query()
      .where('tenant_id', this.tenant.id)
      .where('kind', 'subscription')
      .where('status', 'pending')
      .where('checkout', true)
      .first()
    if (!pending) return
    await refreshCharge(pending)
    if (pending.status === 'pending' && !pending.wompiTransactionId) {
      await finalize(pending, 'expired', 'Se inició otro pago.')
    }
  }

  /** Charge of the next period, by the automatic renewal */
  async renew(subscription: Subscription) {
    const method = await this.activeMethod()
    const end = subscription.currentPeriodEndsAt
    if (!end) return null
    const charge = await db.transaction(async (trx) => {
      if (await this.pendingPlanCharge(trx)) return null
      return this.createPlanCharge(trx, subscription, {
        from: end,
        method,
        userId: null,
        automatic: true,
      })
    })
    if (!charge) return null
    if (!method) {
      await finalize(charge, 'error', 'No hay un medio de pago guardado.')
      return charge
    }
    await submitCharge(charge, method)
    return charge
  }

  /**
   * Additional email packs for this month: charged right away to the saved
   * method, or paid in Wompi's checkout when there is none.
   */
  async buyEmailPacks(packs: number, user: User) {
    assertPaymentsEnabled(this.tenant)
    const method = await this.activeMethod()
    const period = quotaPeriod(this.tenant)
    const month = DateTime.fromISO(period).setLocale('es').toFormat('LLLL yyyy')
    const emails = (packs * EMAIL_PACK_SIZE).toLocaleString('es-CO')
    const charge = await BillingCharge.create({
      tenantId: this.tenant.id,
      environment: environment(),
      reference: newReference('MAIL'),
      kind: 'email_packs',
      description: `${packs} ${packs === 1 ? 'paquete' : 'paquetes'} de correos (${emails}) · ${month}`,
      amountCents: packs * EMAIL_PACK_PRICE * 100,
      currency: 'COP',
      status: 'pending',
      paymentMethodId: method?.id ?? null,
      paymentMethodLabel: method?.label ?? null,
      checkout: !method,
      automatic: false,
      packs,
      quotaPeriod: DateTime.fromISO(period),
      createdById: user.id,
    })
    if (method) {
      await submitCharge(charge, method)
      return { charge, checkoutUrl: null }
    }
    return { charge, checkoutUrl: this.checkoutOf(charge, user) }
  }

  /** Amount the next automatic renewal would charge, with today's units */
  async nextRenewalAmount(subscription: Subscription) {
    const units = await billableUnits(this.tenant, subscription)
    return quote(units).total
  }

  private pendingPlanCharge(trx: TransactionClientContract) {
    return BillingCharge.query({ client: trx })
      .where('tenant_id', this.tenant.id)
      .where('kind', 'subscription')
      .where('status', 'pending')
      .first()
  }

  private async assertNoPendingPlanCharge(trx: TransactionClientContract) {
    const pending = await this.pendingPlanCharge(trx)
    if (pending) {
      fail(
        pending.checkout
          ? 'Hay un pago del plan en proceso en Wompi. Con PSE empresarial el banco puede tardar en aprobarlo; te avisaremos por correo.'
          : 'Ya hay un pago del plan en proceso. Espera a que Wompi lo confirme.'
      )
    }
  }

  private async createPlanCharge(
    trx: TransactionClientContract,
    subscription: Subscription,
    options: {
      from: DateTime
      method: BillingPaymentMethod | null
      userId: string | null
      automatic: boolean
    }
  ) {
    const units = await billableUnits(this.tenant, subscription)
    const price = quote(units)
    const to = options.from.plus({ months: 1 })
    return BillingCharge.create(
      {
        tenantId: this.tenant.id,
        environment: environment(),
        reference: newReference('PLAN'),
        kind: 'subscription',
        description: `Plan ${PLAN.name} · mensual · ${units.toLocaleString('es-CO')} unidades · ${dateLabel(options.from)} al ${dateLabel(to)}`,
        amountCents: price.total * 100,
        currency: 'COP',
        status: 'pending',
        paymentMethodId: options.method?.id ?? null,
        paymentMethodLabel: options.method?.label ?? null,
        // Without a saved method (and not automatic) it is paid in the checkout
        checkout: !options.method && !options.automatic,
        automatic: options.automatic,
        plan: PLAN.id,
        billingCycle: 'monthly',
        units,
        periodStartsAt: options.from,
        periodEndsAt: to,
        createdById: options.userId,
      },
      { client: trx }
    )
  }
}

/** Old payment sources are cancelled in Wompi when possible (cards cannot be) */
async function voidQuietly(method: BillingPaymentMethod) {
  if (method.type === 'CARD') return
  try {
    await wompi.api.voidPaymentSource(Number(method.wompiPaymentSourceId))
  } catch (err) {
    logger.warn({ err, paymentMethodId: method.id }, 'could not void the wompi payment source')
  }
}

/** Sends the charge to Wompi with the saved payment source */
async function submitCharge(charge: BillingCharge, method: BillingPaymentMethod) {
  let transaction: WompiTransaction
  try {
    transaction = await wompi.api.createTransaction({
      reference: charge.reference,
      amountInCents: charge.amountCents,
      customerEmail: method.customerEmail,
      paymentSourceId: Number(method.wompiPaymentSourceId),
      installments: method.type === 'CARD' ? 1 : undefined,
      recurrent: method.type === 'CARD' ? charge.kind === 'subscription' : undefined,
    })
  } catch (error) {
    if (error instanceof WompiError && error.status < 500) {
      await finalize(charge, 'error', error.message)
      return
    }
    // Wompi did not answer: it may or may not have created it; the query by
    // reference settles it later
    logger.error({ err: error, chargeId: charge.id }, 'wompi transaction request failed')
    return
  }
  await settle(charge, transaction)
}

/**
 * Brings a pending charge up to date from Wompi (the source of truth): from
 * its event, the scheduler, or the person waiting in the back-office.
 */
export async function refreshCharge(charge: BillingCharge) {
  if (charge.status !== 'pending' || charge.environment !== environment()) return charge
  const transaction = charge.wompiTransactionId
    ? await wompi.api.getTransaction(charge.wompiTransactionId)
    : await wompi.api.findTransactionByReference(charge.reference)
  if (!transaction) {
    // Never started in Wompi: the checkout was abandoned, or the request was lost
    if (charge.createdAt < DateTime.now().minus({ hours: 24 })) {
      await finalize(charge, 'expired', null)
    }
    return charge
  }
  await settle(charge, transaction)
  return charge
}

/**
 * Checkout only: an attempt was declined and closed the charge, and then the
 * person paid with another attempt. The approved transaction (checked in
 * Wompi's API) reopens it so the payment is not lost.
 */
export async function reopenCheckout(charge: BillingCharge, transactionId: string) {
  if (
    !charge.checkout ||
    charge.status === 'approved' ||
    charge.wompiTransactionId === transactionId
  ) {
    return false
  }
  const transaction = await wompi.api.getTransaction(transactionId)
  if (transaction?.status !== 'APPROVED' || transaction.reference !== charge.reference) return false
  const reopened = await db
    .from('billing_charges')
    .where('id', charge.id)
    .whereNot('status', 'approved')
    .whereNull('applied_at')
    .update({
      status: 'pending',
      wompi_transaction_id: transaction.id,
      finalized_at: null,
      notified_at: null,
      updated_at: new Date(),
    })
    .returning('id')
  if (reopened.length === 0) return false
  await charge.refresh()
  await settle(charge, transaction)
  return true
}

const CHECKOUT_METHOD_LABELS: Record<string, string> = {
  PSE: 'PSE',
  CARD: 'Tarjeta',
  NEQUI: 'Nequi',
  BANCOLOMBIA_TRANSFER: 'Bancolombia',
  BANCOLOMBIA_QR: 'QR Bancolombia',
  DAVIPLATA: 'DaviPlata',
  BANCOLOMBIA_COLLECT: 'Corresponsal Bancolombia',
}
const checkoutMethodLabel = (type: string) => `${CHECKOUT_METHOD_LABELS[type] ?? type} · Wompi`

/** Records Wompi's result after checking it is this charge */
async function settle(charge: BillingCharge, transaction: WompiTransaction) {
  if (
    transaction.reference !== charge.reference ||
    transaction.amountInCents !== charge.amountCents ||
    transaction.currency !== charge.currency
  ) {
    logger.error(
      { chargeId: charge.id, reference: transaction.reference, amount: transaction.amountInCents },
      'wompi transaction does not match the charge'
    )
    await finalize(charge, 'error', 'El pago en Wompi no coincide con el cobro.')
    return
  }
  const status = statusOf(transaction)
  if (status === 'pending') {
    if (!charge.wompiTransactionId) {
      charge.wompiTransactionId = transaction.id
      await charge.save()
    }
    return
  }
  await finalize(charge, status, transaction.statusMessage, transaction)
}

/**
 * Final status of a charge, once: only the call that moves it out of
 * `pending` applies its effect and notifies.
 */
async function finalize(
  charge: BillingCharge,
  status: Exclude<BillingChargeStatus, 'pending'>,
  message: string | null,
  transaction?: WompiTransaction
) {
  const updated = await db
    .from('billing_charges')
    .where('id', charge.id)
    .where('status', 'pending')
    .update({
      status,
      status_message: message?.slice(0, 300) ?? null,
      wompi_transaction_id: transaction?.id ?? charge.wompiTransactionId,
      // Checkout: the method the person chose in Wompi (PSE, card…)
      payment_method_label:
        charge.checkout && transaction?.paymentMethodType
          ? checkoutMethodLabel(transaction.paymentMethodType)
          : charge.paymentMethodLabel,
      finalized_at: new Date(),
      updated_at: new Date(),
    })
    .returning('id')
  await charge.refresh()
  if (updated.length === 0) return

  if (status === 'approved') {
    await applyCharge(charge)
  } else if (charge.kind === 'subscription' && charge.automatic) {
    await scheduleRetry(charge)
  }
  await notifyChargeResult(charge)
}

/** Effect of an approved charge, exactly once (claimed with `applied_at`) */
async function applyCharge(charge: BillingCharge) {
  await db.transaction(async (trx) => {
    const claimed = await trx
      .from('billing_charges')
      .where('id', charge.id)
      .where('status', 'approved')
      .whereNull('applied_at')
      .update({ applied_at: new Date() })
      .returning('id')
    if (claimed.length === 0) return

    const tenant = await Tenant.findOrFail(charge.tenantId, { client: trx })
    if (charge.kind === 'email_packs') {
      await new EmailQuotaService(tenant).addPacks(
        charge.packs ?? 0,
        charge.quotaPeriod!.toISODate()!,
        trx
      )
      return
    }

    const subscription = await Subscription.query({ client: trx })
      .where('tenant_id', charge.tenantId)
      .forUpdate()
      .firstOrFail()
    const paidUntil = charge.periodEndsAt!
    const end =
      subscription.currentPeriodEndsAt && subscription.currentPeriodEndsAt > paidUntil
        ? subscription.currentPeriodEndsAt
        : paidUntil
    const method = await BillingPaymentMethod.query({ client: trx })
      .where('tenant_id', charge.tenantId)
      .where('environment', charge.environment)
      .where('status', 'active')
      .first()
    // Paying (or renewing) turns the renewal on, unless it was cancelled meanwhile
    const autoRenew = !!method && (charge.automatic ? subscription.autoRenew : true)
    subscription.merge({
      status: 'active',
      plan: PLAN.id,
      billingCycle: 'monthly',
      currentPeriodEndsAt: end,
      autoRenew,
      cancelledAt: autoRenew ? null : subscription.cancelledAt,
      renewalAttempts: 0,
      nextRenewalAt: autoRenew ? end.minus({ hours: RENEWAL_CHARGE_HOURS_BEFORE }) : null,
    })
    await subscription.save()
  })
}

/**
 * A failed automatic renewal: retried 1, 3 and 5 days after the period ends;
 * meanwhile the plan is "payment pending" and stays editable for the grace days.
 */
async function scheduleRetry(charge: BillingCharge) {
  const subscription = await Subscription.findBy('tenant_id', charge.tenantId)
  if (!subscription?.currentPeriodEndsAt) return
  const attempts = subscription.renewalAttempts + 1
  const retryInDays = RENEWAL_RETRY_DAYS[attempts - 1]
  const retryAt = retryInDays
    ? DateTime.max(
        DateTime.now().plus({ hours: 1 }),
        subscription.currentPeriodEndsAt.plus({ days: retryInDays })
      )
    : null
  subscription.merge({
    status: 'past_due',
    renewalAttempts: attempts,
    nextRenewalAt: subscription.autoRenew ? retryAt : null,
  })
  await subscription.save()
}

/** Date of the next automatic retry (for the failure notice) */
export function nextRetryOf(subscription: Subscription | null) {
  return subscription?.autoRenew ? subscription.nextRenewalAt : null
}
