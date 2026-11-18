import { RecurringChargeSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ChargeConcept from '#models/charge_concept'
import Unit from '#models/unit'
import FeeSchedule from '#models/fee_schedule'

/** Tarifa: what a unit pays every month for a concept, between two months */
export default class RecurringCharge extends RecurringChargeSchema {
  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => ChargeConcept)
  declare chargeConcept: BelongsTo<typeof ChargeConcept>

  @belongsTo(() => FeeSchedule)
  declare feeSchedule: BelongsTo<typeof FeeSchedule>
}
