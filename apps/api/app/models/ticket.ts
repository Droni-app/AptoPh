import { TicketSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { TICKET_PRIORITIES, TICKET_STATUSES, TICKET_TYPES, ValueOf } from '@aptoph/shared'
import Unit from '#models/unit'
import User from '#models/user'
import TicketComment from '#models/ticket_comment'

export default class Ticket extends TicketSchema {
  declare type: ValueOf<typeof TICKET_TYPES>
  declare priority: ValueOf<typeof TICKET_PRIORITIES>
  declare status: ValueOf<typeof TICKET_STATUSES>

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'assignedToId' })
  declare assignedTo: BelongsTo<typeof User>

  @hasMany(() => TicketComment)
  declare comments: HasMany<typeof TicketComment>
}
