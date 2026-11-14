import type { Knex } from 'knex'

/**
 * Helpers shared by tenant-scoped migrations. See docs/database-model.md §1.1.
 *
 * Every tenant table gets:
 *  - `id uuid` (uuidv7) primary key
 *  - `tenant_id` FK → tenants
 *  - UNIQUE (tenant_id, id), so other tables can reference it with a
 *    composite FK that guarantees both rows belong to the same tenant
 */
export function tenantTable(table: Knex.CreateTableBuilder, raw: (sql: string) => Knex.Raw) {
  table.uuid('id').primary().defaultTo(raw('uuidv7()'))
  table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT')
  table.unique(['tenant_id', 'id'])
}

/**
 * Composite FK `(tenant_id, column) → refTable(tenant_id, id)`.
 * The column must already be declared.
 */
export function tenantForeign(
  table: Knex.CreateTableBuilder,
  column: string,
  refTable: string,
  onDelete: 'CASCADE' | 'RESTRICT' | 'SET NULL' = 'RESTRICT'
) {
  const builder = table
    .foreign(['tenant_id', column])
    .references(['tenant_id', 'id'])
    .inTable(refTable)

  /**
   * `SET NULL` on a composite FK would also null `tenant_id`; PostgreSQL 15+
   * allows restricting it to the referencing column only.
   */
  if (onDelete === 'SET NULL') {
    builder.onDelete(`SET NULL (${column})` as 'SET NULL')
  } else {
    builder.onDelete(onDelete)
  }
}

/** FK to the global users table */
export function userForeign(
  table: Knex.CreateTableBuilder,
  column: string,
  options: { nullable?: boolean; onDelete?: 'CASCADE' | 'RESTRICT' | 'SET NULL' } = {}
) {
  const nullable = options.nullable ?? true
  const col = table.uuid(column)
  if (nullable) col.nullable()
  else col.notNullable()
  col
    .references('id')
    .inTable('users')
    .onDelete(options.onDelete ?? (nullable ? 'SET NULL' : 'RESTRICT'))
}

export function timestamps(table: Knex.CreateTableBuilder, options: { softDelete?: boolean } = {}) {
  table.timestamp('created_at', { useTz: true }).notNullable()
  table.timestamp('updated_at', { useTz: true }).nullable()
  if (options.softDelete) {
    table.timestamp('deleted_at', { useTz: true }).nullable()
  }
}

/** CHECK (column IN (...)) */
export function checkIn(table: Knex.CreateTableBuilder, column: string, values: readonly string[]) {
  table.check(`${column} IN (${values.map((value) => `'${value}'`).join(', ')})`)
}
