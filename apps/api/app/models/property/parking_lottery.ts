import { ParkingLotterySchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { ParkingLotteryStatus } from '@aptoph/shared'
import User from '#models/auth/user'
import ParkingApplication from '#models/property/parking_application'

/** Lottery of the communal spots for a period. docs/parking.md §Sorteo */
export default class ParkingLottery extends ParkingLotterySchema {
  declare status: ParkingLotteryStatus

  @belongsTo(() => User, { foreignKey: 'drawnById' })
  declare drawnBy: BelongsTo<typeof User>

  @hasMany(() => ParkingApplication, { foreignKey: 'lotteryId' })
  declare applications: HasMany<typeof ParkingApplication>
}
