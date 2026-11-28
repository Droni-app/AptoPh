import { SurveyQuestionSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import SurveyOption from '#models/surveys/survey_option'

/** A single-choice question of a survey */
export default class SurveyQuestion extends SurveyQuestionSchema {
  @hasMany(() => SurveyOption, { foreignKey: 'questionId' })
  declare options: HasMany<typeof SurveyOption>
}
