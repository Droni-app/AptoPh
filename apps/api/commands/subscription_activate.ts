import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Activates a conjunto's paid plan once the payment was received (manual billing,
 * until a payment gateway is integrated). Extends from the current period end
 * when it is still running, so renewing early never loses days.
 */
export default class SubscriptionActivate extends BaseCommand {
  static commandName = 'subscription:activate'
  static description = 'Activa (o renueva) el plan pagado de un conjunto (un mes)'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Slug del conjunto' })
  declare slug: string

  async run() {
    const { DateTime } = await import('luxon')
    const { PLAN } = await import('@aptoph/shared')
    const { default: Tenant } = await import('#models/tenants/tenant')

    const tenant = await Tenant.findBy('slug', this.slug)
    const subscription = tenant ? await tenant.related('subscription').query().first() : null
    if (!tenant || !subscription) {
      this.logger.error(`No existe un conjunto con suscripción y slug "${this.slug}"`)
      this.exitCode = 1
      return
    }

    subscription.plan = PLAN.id
    subscription.billingCycle = 'monthly'

    const now = DateTime.now()
    const from =
      subscription.status === 'active' &&
      subscription.currentPeriodEndsAt &&
      subscription.currentPeriodEndsAt > now
        ? subscription.currentPeriodEndsAt
        : now

    subscription.status = 'active'
    subscription.currentPeriodEndsAt = from.plus({ months: 1 })
    await subscription.save()

    tenant.status = 'active'
    await tenant.save()

    this.logger.success(
      `${tenant.name}: plan ${PLAN.name} activo hasta el ${subscription.currentPeriodEndsAt.toISODate()}`
    )
  }
}
