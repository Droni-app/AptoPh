import { BaseSchema } from '@adonisjs/lucid/schema'
import { UNIT_STATUSES, UNIT_TYPES } from '@aptoph/shared'
import { checkIn, tenantForeign, tenantTable, timestamps } from '#database/tenant_schema'

export default class extends BaseSchema {
  protected tableName = 'units'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('building_id').nullable()
      table.string('code', 30).notNullable()
      table.string('type', 20).notNullable().defaultTo('apartment')
      table.smallint('floor').nullable()
      /**
       * Private area in square meters
       */
      table.decimal('private_area', 10, 2).nullable()
      /**
       * Coeficiente de copropiedad (fraction, e.g. 0.012345)
       */
      table.decimal('ownership_coefficient', 9, 6).notNullable().defaultTo(0)
      table.uuid('parent_unit_id').nullable()
      table.string('status', 20).notNullable().defaultTo('vacant')
      table.text('notes').nullable()
      timestamps(table, { softDelete: true })

      tenantForeign(table, 'building_id', 'buildings', 'RESTRICT')
      tenantForeign(table, 'parent_unit_id', 'units', 'SET NULL')
      checkIn(table, 'type', UNIT_TYPES)
      checkIn(table, 'status', UNIT_STATUSES)
      table.check('ownership_coefficient >= 0 AND ownership_coefficient <= 1')
      table.index(['tenant_id', 'building_id'])
    })

    /**
     * Unit codes are unique per building; units without building are unique per tenant.
     * Soft-deleted units free their code.
     */
    this.schema.raw(
      'CREATE UNIQUE INDEX units_tenant_building_code_unique ON units (tenant_id, building_id, code) WHERE deleted_at IS NULL AND building_id IS NOT NULL'
    )
    this.schema.raw(
      'CREATE UNIQUE INDEX units_tenant_code_without_building_unique ON units (tenant_id, code) WHERE deleted_at IS NULL AND building_id IS NULL'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
