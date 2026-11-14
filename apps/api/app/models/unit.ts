import { UnitSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { UnitStatus, UnitType } from '@apartadock/shared'
import Tenant from '#models/tenant'
import Building from '#models/building'
import UnitOccupant from '#models/unit_occupant'
import Vehicle from '#models/vehicle'
import Pet from '#models/pet'
import Charge from '#models/charge'

export default class Unit extends UnitSchema {
  declare type: UnitType
  declare status: UnitStatus

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => Building)
  declare building: BelongsTo<typeof Building>

  @belongsTo(() => Unit, { foreignKey: 'parentUnitId' })
  declare parentUnit: BelongsTo<typeof Unit>

  @hasMany(() => UnitOccupant)
  declare occupants: HasMany<typeof UnitOccupant>

  @hasMany(() => Vehicle)
  declare vehicles: HasMany<typeof Vehicle>

  @hasMany(() => Pet)
  declare pets: HasMany<typeof Pet>

  @hasMany(() => Charge)
  declare charges: HasMany<typeof Charge>
}
