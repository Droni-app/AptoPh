import { BudgetSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import type { BudgetStatus } from '@aptoph/shared'
import BudgetItem from '#models/finance/budget_item'

export default class Budget extends BudgetSchema {
  declare status: BudgetStatus

  @hasMany(() => BudgetItem)
  declare items: HasMany<typeof BudgetItem>
}
