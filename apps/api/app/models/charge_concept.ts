import { ChargeConceptSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import type { CHARGE_CALCULATIONS, CHARGE_CONCEPT_TYPES, ValueOf } from '@aptoph/shared'
import Charge from '#models/charge'

export default class ChargeConcept extends ChargeConceptSchema {
  declare type: ValueOf<typeof CHARGE_CONCEPT_TYPES>
  declare calculation: ValueOf<typeof CHARGE_CALCULATIONS>

  @hasMany(() => Charge)
  declare charges: HasMany<typeof Charge>
}
