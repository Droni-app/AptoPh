import { BaseSchema } from '@adonisjs/lucid/schema'
import { ATTACHMENT_OWNER_TYPES } from '@aptoph/shared'
import { checkIn } from '#database/tenant_schema'

/**
 * PQRS can have attachments (`attachments.owner_type = 'ticket'`): the CHECK of
 * `attachments.owner_type` follows ATTACHMENT_OWNER_TYPES again.
 */
export default class extends BaseSchema {
  protected tableName = 'attachments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropChecks(['attachments_owner_type_check'])
      checkIn(table, 'owner_type', ATTACHMENT_OWNER_TYPES, 'attachments_owner_type_check')
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.from(this.tableName).where('owner_type', 'ticket').delete()
    })
    this.schema.alterTable(this.tableName, (table) => {
      table.dropChecks(['attachments_owner_type_check'])
      checkIn(
        table,
        'owner_type',
        ATTACHMENT_OWNER_TYPES.filter((type) => type !== 'ticket'),
        'attachments_owner_type_check'
      )
    })
  }
}
