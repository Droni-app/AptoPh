import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Blocks back-office writes when the trial ended or the paid period expired.
 * Reading stays available so the conjunto never loses access to its data.
 * Tenants without a subscription are managed accounts and are not restricted.
 * Must run after `tenant`.
 */
export default class SubscriptionMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const subscription = await ctx.tenant.related('subscription').query().first()

    if (subscription && !subscription.canWrite()) {
      return ctx.response.status(402).send({
        errors: [
          {
            message: subscription.isTrialing
              ? 'Tu periodo de prueba terminó. Activa un plan para seguir editando la información.'
              : 'Tu plan no está activo. Actívalo para seguir editando la información.',
            rule: 'subscription_inactive',
          },
        ],
      })
    }

    return next()
  }
}
