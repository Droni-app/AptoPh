import { BaseMail } from '@adonisjs/mail'
import { formatCop, MINIMUM_MONTHLY, PRICE_PER_UNIT, quote, TRIAL_DAYS } from '@aptoph/shared'
import type Subscription from '#models/billing/subscription'
import type Tenant from '#models/tenants/tenant'
import type User from '#models/auth/user'

/**
 * Sent after the self-service sign-up: trial dates and the link to the back-office
 */
export default class WelcomeMail extends BaseMail {
  subject = 'Bienvenido a AptoPH · tu prueba de 30 días comenzó'

  constructor(
    private user: User,
    private tenant: Tenant,
    private subscription: Subscription,
    private backofficeUrl: string,
    readonly verifyUrl: string
  ) {
    super()
  }

  prepare() {
    const trialEndsOn = this.subscription
      .trialEndsAt!.setZone(this.tenant.timezone)
      .setLocale('es-CO')
      .toFormat("d 'de' LLLL 'de' yyyy")
    const firstName = this.user.fullName.split(' ')[0]
    const price = quote(this.subscription.declaredUnits)

    this.message
      .to(this.user.email, this.user.fullName)
      .htmlView('emails/welcome', {
        firstName,
        tenantName: this.tenant.name,
        pricePerUnit: formatCop(PRICE_PER_UNIT),
        minimumMonthly: formatCop(MINIMUM_MONTHLY),
        monthly: formatCop(price.monthly),
        minimumApplied: price.minimumApplied,
        units: this.subscription.declaredUnits.toLocaleString('es-CO'),
        trialDays: TRIAL_DAYS,
        trialEndsOn,
        backofficeUrl: this.backofficeUrl,
        verifyUrl: this.verifyUrl,
      })
      .text(
        [
          `Hola, ${firstName}:`,
          `Ya creamos ${this.tenant.name} en AptoPH. Tienes ${TRIAL_DAYS} días de prueba gratis, hasta el ${trialEndsOn}, con todas las funciones.`,
          `Entra al panel de administración: ${this.backofficeUrl}`,
          'Primeros pasos: crea las torres, carga las unidades e invita al consejo.',
          `Confirma tu correo: ${this.verifyUrl}`,
        ].join('\n\n')
      )
  }
}
