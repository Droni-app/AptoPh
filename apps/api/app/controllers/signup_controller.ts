import type { HttpContext } from '@adonisjs/core/http'
import { errors as vineErrors } from '@vinejs/vine'
import mail from '@adonisjs/mail/services/main'
import logger from '@adonisjs/core/services/logger'
import {
  MINIMUM_MONTHLY,
  PRICE_TIERS,
  TRIAL_DAYS,
  formatCop,
  tierLabel,
  type PlanId,
} from '@aptoph/shared'
import OauthClient from '#models/oauth_client'
import WelcomeMail from '#mails/welcome_mail'
import SignupService, { EmailTakenError } from '#services/signup_service'
import { signupValidator } from '#validators/signup'

const DEFAULT_PLAN: PlanId = 'completo'
const FIELDS = ['fullName', 'email', 'phone', 'tenantName', 'city', 'units', 'plan'] as const

type FormValues = Partial<Record<(typeof FIELDS)[number], string>>

/**
 * Hosted self-service sign-up (GET/POST /registro). Lives on the API, like the login
 * page, so a successful sign-up starts the SSO session: the back-office then
 * completes the OAuth flow without asking for the password again.
 */
export default class SignupController {
  async show(ctx: HttpContext) {
    const units = String(ctx.request.input('unidades', ''))
    return this.render(ctx, { units: /^\d{1,5}$/.test(units) ? units : '' })
  }

  async store(ctx: HttpContext) {
    const values = Object.fromEntries(
      FIELDS.map((field) => [field, String(ctx.request.input(field, '')).trim()])
    ) as FormValues

    // Honeypot: real people never fill this hidden field
    if (ctx.request.input('website')) return this.render(ctx, values)

    let data
    try {
      data = await ctx.request.validateUsing(signupValidator)
    } catch (error) {
      if (error instanceof vineErrors.E_VALIDATION_ERROR) {
        const errors: Record<string, string> = {}
        for (const item of error.messages as Array<{ field: string; message: string }>) {
          errors[item.field] ??= item.message
        }
        return this.render(ctx, values, { errors }, 422)
      }
      throw error
    }

    let result
    try {
      result = await new SignupService().register(data)
    } catch (error) {
      if (error instanceof EmailTakenError) {
        return this.render(
          ctx,
          values,
          {
            errors: {
              email: 'Ya existe una cuenta con este correo. Inicia sesión para continuar.',
            },
          },
          422
        )
      }
      throw error
    }

    const backofficeUrl = await this.backofficeUrl()
    await ctx.auth.use('web').login(result.user)

    mail
      .sendLater(new WelcomeMail(result.user, result.tenant, result.subscription, backofficeUrl))
      .catch((error) => logger.error({ err: error }, 'Could not queue the welcome mail'))

    // The back-office login page starts the OAuth flow by itself; the SSO session
    // created above makes it come back with a code without showing the form
    const next = new URL('/login', backofficeUrl)
    next.searchParams.set('auto', '1')
    next.searchParams.set('redirect', '/?bienvenida=1')
    return ctx.response.redirect().withQs(false).toPath(next.toString())
  }

  private async backofficeUrl() {
    const client = await OauthClient.findActiveByClientId('backoffice')
    const redirectUri = client?.redirectUris[0]
    return redirectUri ? new URL(redirectUri).origin : 'http://localhost:5174'
  }

  private async render(
    ctx: HttpContext,
    values: FormValues,
    extra: { errors?: Record<string, string> } = {},
    status = 200
  ) {
    const html = await ctx.view.render('signup', {
      values,
      errors: extra.errors ?? {},
      plan: DEFAULT_PLAN,
      tiers: PRICE_TIERS.map((tier) => ({
        label: tierLabel(tier),
        price: formatCop(tier.pricePerUnit),
      })),
      minimum: formatCop(MINIMUM_MONTHLY),
      trialDays: TRIAL_DAYS,
      loginUrl: `${await this.backofficeUrl()}/login`,
    })
    return ctx.response
      .status(status)
      .header('Content-Type', 'text/html; charset=utf-8')
      .header('Cache-Control', 'no-store')
      .send(html)
  }
}
