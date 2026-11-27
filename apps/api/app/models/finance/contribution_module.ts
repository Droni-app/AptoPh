import { ContributionModuleSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import ContributionModuleUnit from '#models/finance/contribution_module_unit'

/** Módulo de contribución (art. 29 Ley 675): a sector with its own shares */
export default class ContributionModule extends ContributionModuleSchema {
  @hasMany(() => ContributionModuleUnit, { foreignKey: 'moduleId' })
  declare units: HasMany<typeof ContributionModuleUnit>
}
