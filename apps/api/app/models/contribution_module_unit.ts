import { ContributionModuleUnitSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ContributionModule from '#models/contribution_module'
import Unit from '#models/unit'

export default class ContributionModuleUnit extends ContributionModuleUnitSchema {
  @belongsTo(() => ContributionModule, { foreignKey: 'moduleId' })
  declare module: BelongsTo<typeof ContributionModule>

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>
}
