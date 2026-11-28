import type { HttpContext } from '@adonisjs/core/http'
import { SurveysService } from '#services/surveys/surveys'
import { surveyVoteValidator } from '#validators/surveys/surveys'

/** Surveys in the portal: the owners vote for their units (docs/surveys.md) */
export default class ResidentSurveysController {
  async index(ctx: HttpContext) {
    return new SurveysService(ctx.tenant).residentList(ctx.auth.getUserOrFail().id)
  }

  async show(ctx: HttpContext) {
    const data = await new SurveysService(ctx.tenant).residentDetail(
      ctx.params.id,
      ctx.auth.getUserOrFail().id
    )
    return { data }
  }

  async vote(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(surveyVoteValidator)
    const data = await new SurveysService(ctx.tenant).vote(
      ctx.params.id,
      ctx.auth.getUserOrFail().id,
      input
    )
    ctx.response.status(201)
    return { data }
  }
}
