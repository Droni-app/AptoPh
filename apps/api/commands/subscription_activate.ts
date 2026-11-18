import { args, BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Activates a conjunto's paid plan once the payment was received (manual billing,
 * until a payment gateway is integrated). Extends from the current period end
 * when it is still running, so renewing early never loses days.
 */
export default class SubscriptionActivate extends BaseCommand {
  static commandName = 'subscription:activate'
  static description = 'Activa (o renueva) el plan pagado de un conjunto'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Slug del conjunto' })
  declare slug: string

  @flags.string({ description: 'Plan: completo o empresarial (por defecto, el elegido)' })
  declare plan?: string

  @flags.string({ description: 'Ciclo: monthly o annual (por defecto, el elegido)' })
  declare cycle?: string

  async run() {
    const { DateTime } = await import('luxon')
    const { PLAN_IDS, BILLING_CYCLES, findPlan } = await import('@aptoph/shared')
    const { default: Tenant } = await import('#models/tenant')

    const tenant = await Tenant.findBy('slug', this.slug)
    const subscription = tenant ? await tenant.related('subscription').query().first() : null
    if (!tenant || !subscription) {
      this.logger.error(`No existe un conjunto con suscripción y slug "${this.slug}"`)
      this.exitCode = 1
      return
    }

    if (this.plan && !(PLAN_IDS as readonly string[]).includes(this.plan)) {
      this.logger.error(`Plan no válido: ${this.plan}`)
      this.exitCode = 1
      return
    }
    if (this.cycle && !(BILLING_CYCLES as readonly string[]).includes(this.cycle)) {
      this.logger.error(`Ciclo no válido: ${this.cycle}`)
      this.exitCode = 1
      return
    }
    if (this.plan) subscription.plan = this.plan as typeof subscription.plan
    if (this.cycle) subscription.billingCycle = this.cycle as typeof subscription.billingCycle

    const now = DateTime.now()
    const from =
      subscription.status === 'active' &&
      subscription.currentPeriodEndsAt &&
      subscription.currentPeriodEndsAt > now
        ? subscription.currentPeriodEndsAt
        : now

    subscription.status = 'active'
    subscription.currentPeriodEndsAt = from.plus(
      subscription.billingCycle === 'annual' ? { years: 1 } : { months: 1 }
    )
    await subscription.save()

    tenant.status = 'active'
    await tenant.save()

    this.logger.success(
      `${tenant.name}: plan ${findPlan(subscription.plan).name} activo hasta el ${subscription.currentPeriodEndsAt.toISODate()}`
    )
  }
}
