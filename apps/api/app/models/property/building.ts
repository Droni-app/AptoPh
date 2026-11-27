import { BuildingSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Tenant from '#models/tenants/tenant'
import Unit from '#models/property/unit'

export default class Building extends BuildingSchema {
  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @hasMany(() => Unit)
  declare units: HasMany<typeof Unit>
}
