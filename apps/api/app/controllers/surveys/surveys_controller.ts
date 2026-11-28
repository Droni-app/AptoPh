import type { HttpContext } from '@adonisjs/core/http'
import type { SurveyInput } from '@aptoph/shared'
import { SurveysService } from '#services/surveys/surveys'
import {
  publishSurveyValidator,
  surveyListValidator,
  surveyValidator,
} from '#validators/surveys/surveys'

/**
 * Surveys in the back-office (docs/surveys.md): the administration creates and
 * publishes them; administration, council and fiscal reviewer see the results.
 */
export default class SurveysController {
  private service(ctx: HttpContext) {
    return new SurveysService(ctx.tenant)
  }

  async index(ctx: HttpContext) {
    const filters = await ctx.request.validateUsing(surveyListValidator, { data: ctx.request.qs() })
    return this.service(ctx).list(filters)
  }

  async stats(ctx: HttpContext) {
    return { data: await this.service(ctx).stats() }
  }

  async show(ctx: HttpContext) {
    const service = this.service(ctx)
    return { data: await service.detail(await service.find(ctx.params.id)) }
  }

  async voters(ctx: HttpContext) {
    const service = this.service(ctx)
    return { data: await service.voters(await service.find(ctx.params.id)) }
  }

  private input(input: Awaited<ReturnType<typeof surveyValidator.validate>>): SurveyInput {
    return {
      title: input.title,
      description: input.description ?? null,
      closesAt: input.closesAt,
      anonymous: input.anonymous,
      resultsVisibility: input.resultsVisibility,
      minParticipation: input.minParticipation ?? null,
      questions: input.questions.map((question) => ({
        text: question.text,
        description: question.description ?? null,
        options: question.options,
      })),
    }
  }

  async store(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(surveyValidator)
    const service = this.service(ctx)
    const survey = await service.create(this.input(input), ctx.auth.getUserOrFail().id)
    ctx.response.status(201)
    return { data: await service.detail(survey) }
  }

  async update(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(surveyValidator)
    const service = this.service(ctx)
    const survey = await service.update(
      ctx.params.id,
      this.input(input),
      ctx.auth.getUserOrFail().id
    )
    return { data: await service.detail(survey) }
  }

  async publish(ctx: HttpContext) {
    const { notify } = await ctx.request.validateUsing(publishSurveyValidator)
    const service = this.service(ctx)
    const { survey, notified } = await service.publish(
      ctx.params.id,
      ctx.auth.getUserOrFail().id,
      notify ?? true
    )
    return { data: await service.detail(survey), notified }
  }

  async destroy(ctx: HttpContext) {
    await this.service(ctx).remove(ctx.params.id)
    return ctx.response.noContent()
  }
}
