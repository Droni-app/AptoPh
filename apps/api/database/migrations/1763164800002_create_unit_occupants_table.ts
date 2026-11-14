import { BaseSchema } from '@adonisjs/lucid/schema'
import { DOCUMENT_TYPES, OCCUPANT_RELATIONSHIPS } from '@apartadock/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'unit_occupants'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('unit_id').notNullable()
      userForeign(table, 'user_id')
      table.string('full_name', 150).notNullable()
      table.string('document_type', 10).nullable()
      table.string('document_number', 30).nullable()
      table.string('phone', 30).nullable()
      table.string('email', 254).nullable()
      table.string('relationship', 20).notNullable()
      table.boolean('is_primary_contact').notNullable().defaultTo(false)
      table.boolean('is_billing_responsible').notNullable().defaultTo(false)
      table.date('starts_on').nullable()
      table.date('ends_on').nullable()
      timestamps(table)

      tenantForeign(table, 'unit_id', 'units', 'CASCADE')
      checkIn(table, 'relationship', OCCUPANT_RELATIONSHIPS)
      table.check(
        `document_type IS NULL OR document_type IN (${DOCUMENT_TYPES.map((v) => `'${v}'`).join(', ')})`
      )
      table.index(['tenant_id', 'unit_id'])
      table.index(['tenant_id', 'user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
