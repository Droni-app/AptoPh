import { BaseSchema } from '@adonisjs/lucid/schema'

/** Events received from Wompi, verified and deduplicated by checksum */
export default class extends BaseSchema {
  protected tableName = 'wompi_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
      table.string('event', 60).notNullable()
      table.string('environment', 10).notNullable()
      table.string('checksum', 64).notNullable().unique()
      table.string('reference', 64).nullable().index()
      table.string('transaction_id', 64).nullable()
      table.jsonb('payload').notNullable()
      table.timestamp('received_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('processed_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
