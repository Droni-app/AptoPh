import { ClearanceCertificateSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Unit from '#models/property/unit'
import User from '#models/auth/user'

/** Paz y salvo issued to a unit */
export default class ClearanceCertificate extends ClearanceCertificateSchema {
  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => User, { foreignKey: 'issuedById' })
  declare issuedBy: BelongsTo<typeof User>
}
