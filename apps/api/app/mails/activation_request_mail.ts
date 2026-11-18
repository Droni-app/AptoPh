import { BaseMail } from '@adonisjs/mail'
import { findPlan, formatCop, quote, BILLING_CYCLE_LABELS } from '@aptoph/shared'
import type Subscription from '#models/subscription'
import type Tenant from '#models/tenant'
import type User from '#models/user'

/**
 * Internal notice to the sales inbox: a conjunto wants to activate a paid plan
 */
export default class ActivationRequestMail extends BaseMail {
  constructor(
    private recipient: string,
    private tenant: Tenant,
    private subscription: Subscription,
    private requestedBy: User,
    private units: number
  ) {
    super()
    this.subject = `Activación de plan · ${tenant.name}`
  }

  prepare() {
    const plan = findPlan(this.subscription.plan)
    const price = plan.selfServe ? quote(this.units, this.subscription.billingCycle) : null
    const lines = [
      `Conjunto: ${this.tenant.name} (${this.tenant.slug}) · ${this.tenant.city ?? 'sin ciudad'}`,
      `Plan: ${plan.name} · ${BILLING_CYCLE_LABELS[this.subscription.billingCycle]}`,
      `Unidades: ${this.units}`,
      price
        ? `Valor: ${formatCop(price.pricePerUnit)} por unidad al mes · ${formatCop(price.total)} por periodo + IVA`
        : 'Valor: a la medida',
      `Solicitado por: ${this.requestedBy.fullName} <${this.requestedBy.email}> ${this.requestedBy.phone ?? ''}`,
      '',
      `Para activarlo tras el pago: node ace subscription:activate ${this.tenant.slug}`,
    ]

    this.message
      .to(this.recipient)
      .replyTo(this.requestedBy.email, this.requestedBy.fullName)
      .text(lines.join('\n'))
  }
}
