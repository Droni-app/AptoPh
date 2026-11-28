import vine from '@vinejs/vine'
import { SURVEY_MAX_OPTIONS, SURVEY_MAX_QUESTIONS, SURVEY_RESULTS_VISIBILITY } from '@aptoph/shared'

export const surveyValidator = vine.create({
  title: vine.string().trim().minLength(3).maxLength(200),
  description: vine.string().trim().maxLength(3000).nullable().optional(),
  closesAt: vine.string().trim(),
  anonymous: vine.boolean(),
  resultsVisibility: vine.enum(SURVEY_RESULTS_VISIBILITY),
  minParticipation: vine.number().min(1).max(100).nullable().optional(),
  questions: vine
    .array(
      vine.object({
        text: vine.string().trim().minLength(3).maxLength(500),
        description: vine.string().trim().maxLength(1000).nullable().optional(),
        options: vine
          .array(vine.string().trim().minLength(1).maxLength(200))
          .minLength(2)
          .maxLength(SURVEY_MAX_OPTIONS),
      })
    )
    .minLength(1)
    .maxLength(SURVEY_MAX_QUESTIONS),
})

export const surveyListValidator = vine.create({
  status: vine.enum(['active', 'draft', 'open', 'closed'] as const).optional(),
  page: vine.number().min(1).optional(),
  perPage: vine.number().min(1).max(100).optional(),
})

export const publishSurveyValidator = vine.create({ notify: vine.boolean().optional() })

export const surveyVoteValidator = vine.create({
  unitIds: vine.array(vine.string().uuid()).minLength(1).maxLength(50),
  answers: vine.record(vine.string().uuid()),
})
