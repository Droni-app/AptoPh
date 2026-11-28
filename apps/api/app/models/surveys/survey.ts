import { SurveySchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { SurveyResultsVisibility, SurveyStatus } from '@aptoph/shared'
import { DateTime } from 'luxon'
import User from '#models/auth/user'
import SurveyQuestion from '#models/surveys/survey_question'

/** A survey to the owners (docs/surveys.md) */
export default class Survey extends SurveySchema {
  declare resultsVisibility: SurveyResultsVisibility

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>

  @hasMany(() => SurveyQuestion)
  declare questions: HasMany<typeof SurveyQuestion>

  statusAt(now = DateTime.now()): SurveyStatus {
    if (!this.publishedAt) return 'draft'
    return now < this.closesAt ? 'open' : 'closed'
  }

  get status() {
    return this.statusAt()
  }
}
