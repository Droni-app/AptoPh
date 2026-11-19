import { BaseMail } from '@adonisjs/mail'
import { EMAIL_PACK_SIZE, emailPacksPrice, formatCop, type EmailQuota } from '@aptoph/shared'
import type Tenant from '#models/tenant'
import type User from '#models/user'

/**
 * Internal notice to the sales inbox: a conjunto wants additional bulk email packs
 */
export default class EmailPacksRequestMail extends BaseMail {
  constructor(
    private recipient: string,
    private tenant: Tenant,
    private packs: number,
    private quota: EmailQuota,
    private requestedBy: User
  ) {
    super()
    this.subject = `Correos adicionales · ${tenant.name}`
  }

  prepare() {
    const emails = (this.packs * EMAIL_PACK_SIZE).toLocaleString('es-CO')
    const lines = [
      `Conjunto: ${this.tenant.name} (${this.tenant.slug})`,
      `Pide: ${this.packs} ${this.packs === 1 ? 'paquete' : 'paquetes'} (${emails} correos) para ${this.quota.period}`,
      `Valor: ${formatCop(emailPacksPrice(this.packs))} + IVA`,
      `Uso del mes: ${this.quota.used.toLocaleString('es-CO')} de ${this.quota.limit.toLocaleString('es-CO')} correos`,
      `Solicitado por: ${this.requestedBy.fullName} <${this.requestedBy.email}> ${this.requestedBy.phone ?? ''}`,
      '',
      `Para activarlos tras el pago: node ace email:add-packs ${this.tenant.slug} ${this.packs}`,
    ]

    this.message
      .to(this.recipient)
      .replyTo(this.requestedBy.email, this.requestedBy.fullName)
      .text(lines.join('\n'))
  }
}
