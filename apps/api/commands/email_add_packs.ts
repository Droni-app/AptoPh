import { args, BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Adds bulk email packs (3,000 emails each) to a conjunto's month by hand: a
 * payment outside Wompi, or a courtesy. Packs bought in the back-office are
 * added by their Wompi charge. docs/email-quota.md
 */
export default class EmailAddPacks extends BaseCommand {
  static commandName = 'email:add-packs'
  static description = 'Activa paquetes de correos adicionales de un conjunto para un mes'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Slug del conjunto' })
  declare slug: string

  @args.string({ description: 'Paquetes de 3.000 correos' })
  declare packs: string

  @flags.string({ description: 'Mes (yyyy-mm); por defecto, el actual del conjunto' })
  declare month?: string

  async run() {
    const { DateTime } = await import('luxon')
    const { EMAIL_PACK_SIZE, EMAIL_PACKS_MAX_PER_REQUEST } = await import('@aptoph/shared')
    const { default: Tenant } = await import('#models/tenant')
    const { EmailQuotaService, quotaPeriod } = await import('#services/email_quota')

    const tenant = await Tenant.findBy('slug', this.slug)
    if (!tenant) {
      this.logger.error(`No existe un conjunto con slug "${this.slug}"`)
      this.exitCode = 1
      return
    }
    const packs = Number(this.packs)
    if (!Number.isInteger(packs) || packs < 1 || packs > EMAIL_PACKS_MAX_PER_REQUEST * 5) {
      this.logger.error(`Cantidad de paquetes no válida: ${this.packs}`)
      this.exitCode = 1
      return
    }

    let period = quotaPeriod(tenant)
    if (this.month) {
      const month = DateTime.fromFormat(this.month, 'yyyy-MM', { zone: tenant.timezone })
      if (!month.isValid || month.toISODate()! < period) {
        this.logger.error(`Mes no válido o ya pasado: ${this.month}`)
        this.exitCode = 1
        return
      }
      period = month.toISODate()!
    }

    const service = new EmailQuotaService(tenant)
    await service.addPacks(packs, period)
    const quota = await service.of(DateTime.fromISO(period, { zone: tenant.timezone }))
    this.logger.success(
      `${tenant.name}: +${(packs * EMAIL_PACK_SIZE).toLocaleString('es-CO')} correos en ${quota.period}. ` +
        `Cupo ${quota.limit.toLocaleString('es-CO')}, usados ${quota.used.toLocaleString('es-CO')}.`
    )
  }
}
