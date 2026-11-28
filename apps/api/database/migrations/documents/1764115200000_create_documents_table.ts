import { BaseSchema } from '@adonisjs/lucid/schema'
import { checkIn, tenantTable, timestamps, userForeign } from '#database/tenant_schema'

/** The values of this first version (the module later grew: see documents_module) */
const DOCUMENT_CATEGORIES = [
  'bylaws',
  'minutes',
  'financial_statement',
  'contract',
  'policy',
  'other',
]
const DOCUMENT_VISIBILITIES = ['public', 'council', 'administration']

export default class extends BaseSchema {
  protected tableName = 'documents'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.string('title', 200).notNullable()
      table.string('category', 30).notNullable()
      table.string('file_key').notNullable()
      table.string('mime_type', 100).notNullable()
      table.bigInteger('size_bytes').notNullable()
      table.string('visibility', 20).notNullable().defaultTo('public')
      userForeign(table, 'uploaded_by_id', { nullable: false })
      timestamps(table, { softDelete: true })

      checkIn(table, 'category', DOCUMENT_CATEGORIES)
      checkIn(table, 'visibility', DOCUMENT_VISIBILITIES)
      table.index(['tenant_id', 'category'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
