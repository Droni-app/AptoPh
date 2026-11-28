import { BaseSchema } from '@adonisjs/lucid/schema'
import { SURVEY_RESULTS_VISIBILITY } from '@aptoph/shared'
import {
  checkIn,
  tenantForeign,
  tenantTable,
  timestamps,
  userForeign,
} from '#database/tenant_schema'

/**
 * Surveys to the owners before the assemblies (docs/surveys.md): one response
 * per unit, weighted by its coefficient.
 *  - `survey_tallies` adds up each option (votes and coefficient): the results.
 *  - `survey_answers` keeps what each unit chose, only in nominal surveys. An
 *    anonymous survey stores no per-vote rows, so not even the database knows
 *    who chose what (a coefficient is almost unique, it would give it away).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('surveys', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.string('title', 200).notNullable()
      table.text('description').nullable()
      table.timestamp('opens_at', { useTz: true }).nullable()
      table.timestamp('closes_at', { useTz: true }).notNullable()
      table.boolean('anonymous').notNullable().defaultTo(true)
      table.string('results_visibility', 20).notNullable().defaultTo('after_vote')
      table.decimal('min_participation', 5, 2).nullable()
      table.timestamp('published_at', { useTz: true }).nullable()
      table.timestamp('reminded_at', { useTz: true }).nullable()
      userForeign(table, 'created_by_id', { onDelete: 'SET NULL' })
      userForeign(table, 'updated_by_id', { onDelete: 'SET NULL' })
      timestamps(table)
      checkIn(table, 'results_visibility', SURVEY_RESULTS_VISIBILITY)
      table.check(
        'min_participation IS NULL OR (min_participation > 0 AND min_participation <= 100)'
      )
      table.check('opens_at IS NULL OR opens_at < closes_at')
      table.index(['tenant_id', 'closes_at'])
    })

    this.schema.createTable('survey_questions', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('survey_id').notNullable()
      table.smallint('position').notNullable()
      table.string('text', 500).notNullable()
      table.text('description').nullable()
      tenantForeign(table, 'survey_id', 'surveys', 'CASCADE')
      table.unique(['survey_id', 'position'])
    })

    this.schema.createTable('survey_options', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('question_id').notNullable()
      table.smallint('position').notNullable()
      table.string('label', 200).notNullable()
      tenantForeign(table, 'question_id', 'survey_questions', 'CASCADE')
      table.unique(['question_id', 'position'])
    })

    this.schema.createTable('survey_responses', (table) => {
      tenantTable(table, this.raw.bind(this))
      table.uuid('survey_id').notNullable()
      table.uuid('unit_id').notNullable()
      userForeign(table, 'user_id', { onDelete: 'SET NULL' })
      /** Coefficient of the unit when it voted */
      table.decimal('coefficient', 9, 6).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      tenantForeign(table, 'survey_id', 'surveys', 'CASCADE')
      tenantForeign(table, 'unit_id', 'units', 'RESTRICT')
      table.unique(['survey_id', 'unit_id'])
    })

    this.schema.createTable('survey_tallies', (table) => {
      table.uuid('tenant_id').notNullable()
      table.uuid('survey_id').notNullable()
      table.uuid('question_id').notNullable()
      table.uuid('option_id').notNullable()
      table.integer('votes').notNullable().defaultTo(0)
      table.decimal('coefficient', 12, 6).notNullable().defaultTo(0)
      table.primary(['survey_id', 'option_id'])
      tenantForeign(table, 'survey_id', 'surveys', 'CASCADE')
      tenantForeign(table, 'question_id', 'survey_questions', 'CASCADE')
      tenantForeign(table, 'option_id', 'survey_options', 'CASCADE')
    })

    this.schema.createTable('survey_answers', (table) => {
      table.uuid('tenant_id').notNullable()
      table.uuid('response_id').notNullable()
      table.uuid('question_id').notNullable()
      table.uuid('option_id').notNullable()
      table.primary(['response_id', 'question_id'])
      tenantForeign(table, 'response_id', 'survey_responses', 'CASCADE')
      tenantForeign(table, 'question_id', 'survey_questions', 'CASCADE')
      tenantForeign(table, 'option_id', 'survey_options', 'CASCADE')
    })
  }

  async down() {
    this.schema.dropTable('survey_answers')
    this.schema.dropTable('survey_tallies')
    this.schema.dropTable('survey_responses')
    this.schema.dropTable('survey_options')
    this.schema.dropTable('survey_questions')
    this.schema.dropTable('surveys')
  }
}
