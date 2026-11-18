import { BaseMail } from '@adonisjs/mail'
import { BACKOFFICE_ROLES, ROLE_LABELS, type EnrollmentRole } from '@aptoph/shared'
import type Enrollment from '#models/enrollment'
import type Tenant from '#models/tenant'
import type User from '#models/user'

/** What the person will be able to do, by role */
function purposeFor(role: EnrollmentRole) {
  return BACKOFFICE_ROLES.includes(role)
    ? 'Desde el panel de administración podrás consultar y gestionar la información del conjunto según tu rol.'
    : 'En el portal de residentes podrás ver tu estado de cuenta, reservar zonas comunes, autorizar visitas y radicar PQRS.'
}

/**
 * Invitation to join a conjunto with a role. The link accepts it (and asks for a
 * password when the person has no account yet).
 */
export default class InvitationMail extends BaseMail {
  constructor(
    private user: User,
    private tenant: Tenant,
    private enrollment: Enrollment,
    readonly acceptUrl: string,
    private invitedBy: User | null
  ) {
    super()
    this.subject = `Te invitaron a ${tenant.name} en AptoPH`
  }

  prepare() {
    const firstName = this.user.fullName.split(' ')[0]
    const roleLabel = ROLE_LABELS[this.enrollment.role]
    const expiresOn = this.enrollment
      .invitationExpiresAt!.setZone(this.tenant.timezone)
      .setLocale('es-CO')
      .toFormat("d 'de' LLLL 'de' yyyy")

    this.message
      .to(this.user.email, this.user.fullName)
      .htmlView('emails/invitation', {
        firstName,
        tenantName: this.tenant.name,
        roleLabel,
        invitedBy: this.invitedBy?.fullName ?? null,
        purpose: purposeFor(this.enrollment.role),
        acceptUrl: this.acceptUrl,
        needsPassword: !this.user.hasPassword,
        expiresOn,
      })
      .text(
        [
          `Hola, ${firstName}:`,
          `Te invitaron a ${this.tenant.name} en AptoPH como ${roleLabel}.`,
          purposeFor(this.enrollment.role),
          `Acepta la invitación aquí: ${this.acceptUrl}`,
          `El enlace vence el ${expiresOn}.`,
        ].join('\n\n')
      )
  }
}
