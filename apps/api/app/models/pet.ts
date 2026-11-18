import { PetSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { PET_SPECIES, ValueOf } from '@aptoph/shared'
import Unit from '#models/unit'

export default class Pet extends PetSchema {
  declare species: ValueOf<typeof PET_SPECIES>

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>
}
