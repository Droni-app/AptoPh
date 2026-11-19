import type { HttpContext } from '@adonisjs/core/http'
import encryption from '@adonisjs/core/services/encryption'
import type {
  BillingConfig,
  BillingOverview,
  ChargeRequestResult,
  PaymentTokenStatus,
} from '@aptoph/shared'
import wompiConfig from '#config/wompi'
import FieldException from '#exceptions/field_exception'
import { appUrl } from '#services/app_urls'
import { assertPaymentsEnabled, BillingService, refreshCharge } from '#services/billing'
import { wompi, WompiError, type WompiToken } from '#services/wompi'
import { serializeCharge, serializePaymentMethod } from '#transformers/billing_transformer'
import {
  autoRenewValidator,
  daviplataOtpValidator,
  daviplataTokenValidator,
  nequiTokenValidator,
  paymentMethodValidator,
  paySubscriptionValidator,
} from '#validators/billing'

const DAVIPLATA_PURPOSE = 'wompi-daviplata'
type DaviplataHandle = { id: string; otp: NonNullable<WompiToken['otp']> }

/** Wompi's validation errors on the person's data become field errors */
async function asField<T>(field: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    if (error instanceof WompiError && error.status < 500)
      throw new FieldException(field, error.message)
    throw error
  }
}

function tokenStatus(token: WompiToken, handle?: string): PaymentTokenStatus {
  const known = ['PENDING', 'APPROVED', 'DECLINED', 'AVAILABLE', 'ERROR']
  return {
    id: token.id,
    status: (known.includes(token.status)
      ? token.status
      : 'PENDING') as PaymentTokenStatus['status'],
    authorizationUrl: token.authorizationUrl ?? null,
    ...(handle ? { handle } : {}),
  }
}

/**
 * Payments of the conjunto to AptoPH (administration only, also while the plan
 * is locked, so it can be paid). docs/billing.md
 */
export default class SubscriptionBillingController {
  /** GET /billing/config — public key and Wompi's contracts to accept (single-use tokens) */
  async config({ tenant }: HttpContext): Promise<{ data: BillingConfig }> {
    assertPaymentsEnabled(tenant!)
    const acceptance = await wompi.api.acceptance()
    return {
      data: {
        environment: wompiConfig.environment as BillingConfig['environment'],
        publicKey: wompiConfig.publicKey,
        apiUrl: wompiConfig.apiUrl,
        acceptance,
      },
    }
  }

  /** GET /billing — payment method, renewal and the latest charges */
  async show({ tenant }: HttpContext): Promise<{ data: BillingOverview }> {
    const service = new BillingService(tenant)
    const [subscription, method, charges] = await Promise.all([
      service.subscription(),
      service.activeMethod(),
      service.charges(),
    ])
    const renewing = !!subscription?.autoRenew && !!subscription.nextRenewalAt
    return {
      data: {
        paymentMethod: method ? serializePaymentMethod(method) : null,
        autoRenew: subscription?.autoRenew ?? false,
        nextChargeAt: renewing ? subscription!.nextRenewalAt!.toISO() : null,
        nextChargeAmount: renewing ? await service.nextRenewalAmount(subscription!) : null,
        failedAttempts: subscription?.renewalAttempts ?? 0,
        graceEndsAt: subscription?.graceEndsAt?.toISO() ?? null,
        charges: charges.map(serializeCharge),
      },
    }
  }

  /** PUT /billing/payment-method — saves (or replaces) the payment method */
  async savePaymentMethod(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(paymentMethodValidator)
    await new BillingService(ctx.tenant).savePaymentMethod(data, ctx.auth.getUserOrFail())
    return this.show(ctx)
  }

  /** DELETE /billing/payment-method — the plan stops renewing by itself */
  async removePaymentMethod(ctx: HttpContext) {
    await new BillingService(ctx.tenant).removePaymentMethod(ctx.auth.getUserOrFail())
    return this.show(ctx)
  }

  /** POST /billing/tokens/nequi — the person approves it in the Nequi app */
  async nequiToken({ request, tenant }: HttpContext): Promise<{ data: PaymentTokenStatus }> {
    assertPaymentsEnabled(tenant!)
    const { phoneNumber } = await request.validateUsing(nequiTokenValidator)
    const token = await asField('phoneNumber', () => wompi.api.createNequiToken(phoneNumber))
    return { data: tokenStatus(token) }
  }

  /**
   * POST /billing/tokens/daviplata — DaviPlata sends a code to the phone. The
   * process (Wompi's OTP links) travels encrypted to the client and back.
   */
  async daviplataToken({ request, tenant }: HttpContext): Promise<{ data: PaymentTokenStatus }> {
    assertPaymentsEnabled(tenant!)
    const data = await request.validateUsing(daviplataTokenValidator)
    const token = await asField('documentNumber', () => wompi.api.createDaviplataToken(data))
    const otp = token.otp!
    await asField('phoneNumber', () => wompi.api.daviplataOtp(otp))
    const handle = encryption.encrypt(
      { id: token.id, otp } satisfies DaviplataHandle,
      '30 minutes',
      DAVIPLATA_PURPOSE
    )
    return { data: tokenStatus(token, handle) }
  }

  /** POST /billing/tokens/daviplata/otp — validates the code (or sends it again) */
  async daviplataOtp({ request, tenant }: HttpContext): Promise<{ data: PaymentTokenStatus }> {
    assertPaymentsEnabled(tenant!)
    const { handle, code } = await request.validateUsing(daviplataOtpValidator)
    const process = encryption.decrypt<DaviplataHandle>(handle, DAVIPLATA_PURPOSE)
    if (!process?.id || !process.otp) {
      throw new FieldException('code', 'El proceso venció. Empieza de nuevo.')
    }
    await asField('code', () => wompi.api.daviplataOtp(process.otp, code))
    const token = await wompi.api.getToken('daviplata', process.id)
    return { data: tokenStatus(token, handle) }
  }

  /** POST /billing/tokens/bancolombia — the person authorizes it on the bank's page */
  async bancolombiaToken({ tenant }: HttpContext): Promise<{ data: PaymentTokenStatus }> {
    assertPaymentsEnabled(tenant!)
    const token = await wompi.api.createBancolombiaToken(
      `${appUrl('backoffice')}/plan?medio=bancolombia`
    )
    return { data: tokenStatus(token) }
  }

  /** GET /billing/tokens/:type/:tokenId — status while the person approves it (Wompi's ids are not uuids) */
  async tokenStatus({ params, tenant }: HttpContext): Promise<{ data: PaymentTokenStatus }> {
    assertPaymentsEnabled(tenant!)
    const type = params.type as 'nequi' | 'daviplata' | 'bancolombia_transfer'
    const token = await asField('token', () => wompi.api.getToken(type, params.tokenId))
    return { data: tokenStatus(token) }
  }

  /**
   * POST /billing/subscription/pay — pays the plan: charged to the saved
   * method, or `checkoutUrl` to pay in Wompi (PSE, card, wallets) without one
   */
  async paySubscription({
    tenant,
    auth,
    request,
    response,
  }: HttpContext): Promise<{ data: ChargeRequestResult }> {
    const { billingCycle } = await request.validateUsing(paySubscriptionValidator)
    const result = await new BillingService(tenant).paySubscription(
      billingCycle,
      auth.getUserOrFail()
    )
    response.status(201)
    return { data: { charge: serializeCharge(result.charge), checkoutUrl: result.checkoutUrl } }
  }

  /** PUT /billing/subscription/auto-renew */
  async autoRenew(ctx: HttpContext) {
    const { enabled } = await ctx.request.validateUsing(autoRenewValidator)
    await new BillingService(ctx.tenant).setAutoRenew(enabled)
    return this.show(ctx)
  }

  /** GET /billing/charges/:id — asks Wompi while it is in process */
  async charge({ tenant, params }: HttpContext) {
    const charge = await new BillingService(tenant).findCharge(params.id)
    if (charge.status === 'pending') await refreshCharge(charge)
    return { data: serializeCharge(charge) }
  }
}
