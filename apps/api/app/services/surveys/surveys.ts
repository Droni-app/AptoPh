import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import {
  SURVEY_REMINDER_HOURS,
  type ResidentSurveyDetail,
  type ResidentSurveyItem,
  type ResidentSurveyUnit,
  type SurveyDetail,
  type SurveyInput,
  type SurveyItem,
  type SurveyParticipation,
  type SurveyQuestion as SurveyQuestionData,
  type SurveyResults,
  type SurveyStatus,
  type SurveyVoteInput,
  type SurveyVoter,
  type UnitRef,
} from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import Survey from '#models/surveys/survey'
import SurveyOption from '#models/surveys/survey_option'
import SurveyQuestion from '#models/surveys/survey_question'
import SurveyResponse from '#models/surveys/survey_response'
import Tenant from '#models/tenants/tenant'
import { NotificationService } from '#services/notifications/notifications'
import { tenantToday } from '#services/resident_scope'

/** A survey must stay open at least this long after publishing */
const MIN_OPEN_MINUTES = 60

type ListFilters = {
  status?: 'active' | 'draft' | 'open' | 'closed'
  page?: number
  perPage?: number
}

type OwnedUnit = UnitRef & { coefficient: number }

const num = (value: string | number | null | undefined) => Number(value ?? 0)

/**
 * Surveys to the owners before the assemblies (docs/surveys.md). One vote per
 * unit, given by one of its owners, weighted by the unit's coefficient.
 */
export class SurveysService {
  constructor(private tenant: Tenant) {}

  /* ------------------------------------------------------------------ */
  /* Units and owners                                                    */
  /* ------------------------------------------------------------------ */

  /** Units that vote: not deleted and with a coefficient */
  private eligibleUnits() {
    return db
      .from('units')
      .where('tenant_id', this.tenant.id)
      .whereNull('deleted_at')
      .where('ownership_coefficient', '>', 0)
  }

  private ownersQuery() {
    const today = tenantToday(this.tenant)
    return db
      .from('unit_occupants as o')
      .join('units as u', (join) =>
        join.on('u.id', 'o.unit_id').andOn('u.tenant_id', 'o.tenant_id')
      )
      .join('enrollments as e', (join) =>
        join.on('e.user_id', 'o.user_id').andOn('e.tenant_id', 'o.tenant_id')
      )
      .where('o.tenant_id', this.tenant.id)
      .where('o.relationship', 'owner')
      .whereNotNull('o.user_id')
      .where('e.role', 'resident')
      .where('e.status', 'active')
      .whereNull('u.deleted_at')
      .where('u.ownership_coefficient', '>', 0)
      .where((q) => q.whereNull('o.starts_on').orWhere('o.starts_on', '<=', today))
      .where((q) => q.whereNull('o.ends_on').orWhere('o.ends_on', '>=', today))
  }

  /** Units the person owns today and can vote for */
  async ownedUnits(userId: string): Promise<OwnedUnit[]> {
    const rows = await this.ownersQuery()
      .leftJoin('buildings as b', 'b.id', 'u.building_id')
      .where('o.user_id', userId)
      .distinct(
        'u.id',
        'u.code',
        'u.type',
        'u.ownership_coefficient',
        'b.id as building_id',
        'b.name as building_name'
      )
      .orderBy('u.code')
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      type: row.type,
      building: row.building_id ? { id: row.building_id, name: row.building_name } : null,
      coefficient: num(row.ownership_coefficient),
    }))
  }

  /** Owners (user ids) of the eligible units, or of some of them */
  private async ownerIds(unitIds?: string[]) {
    const rows = await this.ownersQuery()
      .if(unitIds, (q) => q.whereIn('o.unit_id', unitIds!))
      .distinct('o.user_id')
    return rows.map((row) => row.user_id as string)
  }

  /* ------------------------------------------------------------------ */
  /* Results                                                             */
  /* ------------------------------------------------------------------ */

  async participation(surveys: Survey[]): Promise<Map<string, SurveyParticipation>> {
    const map = new Map<string, SurveyParticipation>()
    if (!surveys.length) return map
    const [eligible] = await this.eligibleUnits()
      .count('* as units')
      .sum('ownership_coefficient as coefficient')
    const voted = await db
      .from('survey_responses')
      .where('tenant_id', this.tenant.id)
      .whereIn(
        'survey_id',
        surveys.map((s) => s.id)
      )
      .groupBy('survey_id')
      .select('survey_id')
      .count('* as units')
      .sum('coefficient as coefficient')
    const bySurvey = new Map(voted.map((row) => [row.survey_id as string, row]))
    for (const survey of surveys) {
      const row = bySurvey.get(survey.id)
      const totalCoefficient = num(eligible.coefficient)
      const votedCoefficient = num(row?.coefficient)
      const minParticipation =
        survey.minParticipation === null ? null : num(survey.minParticipation)
      map.set(survey.id, {
        eligibleUnits: num(eligible.units),
        votedUnits: num(row?.units),
        votedCoefficient,
        totalCoefficient,
        minParticipation,
        reached:
          minParticipation === null ||
          (totalCoefficient > 0 && (votedCoefficient / totalCoefficient) * 100 >= minParticipation),
      })
    }
    return map
  }

  private async results(survey: Survey, questions: SurveyQuestionData[]): Promise<SurveyResults> {
    const rows = await db
      .from('survey_tallies')
      .where('tenant_id', this.tenant.id)
      .where('survey_id', survey.id)
      .select('question_id', 'option_id', 'votes', 'coefficient')
    const key = (q: string, o: string) => `${q}:${o}`
    const totals = new Map(rows.map((row) => [key(row.question_id, row.option_id), row]))
    const participation = await this.participation([survey])
    return {
      participation: participation.get(survey.id)!,
      questions: questions.map((question) => ({
        questionId: question.id,
        options: question.options.map((option) => {
          const row = totals.get(key(question.id, option.id))
          return { optionId: option.id, votes: num(row?.votes), coefficient: num(row?.coefficient) }
        }),
      })),
    }
  }

  /* ------------------------------------------------------------------ */
  /* Reading                                                             */
  /* ------------------------------------------------------------------ */

  async find(id: string) {
    const survey = await Survey.query().where('tenant_id', this.tenant.id).where('id', id).first()
    if (!survey) throw ResourceException.notFound('La encuesta no existe')
    return survey
  }

  private async questionsOf(survey: Survey): Promise<SurveyQuestionData[]> {
    const questions = await SurveyQuestion.query()
      .where('tenant_id', this.tenant.id)
      .where('survey_id', survey.id)
      .preload('options', (q) => q.orderBy('position'))
      .orderBy('position')
    return questions.map((question) => ({
      id: question.id,
      text: question.text,
      description: question.description,
      options: question.options.map((option) => ({ id: option.id, label: option.label })),
    }))
  }

  private async questionCounts(surveyIds: string[]) {
    if (!surveyIds.length) return new Map<string, number>()
    const rows = await db
      .from('survey_questions')
      .where('tenant_id', this.tenant.id)
      .whereIn('survey_id', surveyIds)
      .groupBy('survey_id')
      .select('survey_id')
      .count('* as total')
    return new Map(rows.map((row) => [row.survey_id as string, num(row.total)]))
  }

  private item(survey: Survey, questionCount: number): SurveyItem {
    return {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      opensAt: survey.opensAt?.toISO() ?? null,
      closesAt: survey.closesAt.toISO()!,
      anonymous: survey.anonymous,
      resultsVisibility: survey.resultsVisibility,
      minParticipation: survey.minParticipation === null ? null : num(survey.minParticipation),
      questionCount,
      createdAt: survey.createdAt.toISO()!,
    }
  }

  /** Back-office list */
  async list(filters: ListFilters) {
    const now = DateTime.now().toISO()
    const query = Survey.query().where('tenant_id', this.tenant.id)
    if (filters.status === 'draft') query.whereNull('published_at')
    if (filters.status === 'open') query.whereNotNull('published_at').where('closes_at', '>', now)
    if (filters.status === 'closed')
      query.whereNotNull('published_at').where('closes_at', '<=', now)
    if (filters.status === 'active')
      query.where((q) => q.whereNull('published_at').orWhere('closes_at', '>', now))
    const page = await query
      .orderByRaw('published_at is null desc')
      .orderBy('closes_at', 'desc')
      .orderBy('created_at', 'desc')
      .paginate(filters.page ?? 1, filters.perPage ?? 20)
    const surveys = page.all()
    const [counts, participation] = await Promise.all([
      this.questionCounts(surveys.map((s) => s.id)),
      this.participation(surveys.filter((s) => s.publishedAt)),
    ])
    return {
      data: surveys.map((survey) => ({
        ...this.item(survey, counts.get(survey.id) ?? 0),
        participation: participation.get(survey.id),
      })),
      metadata: page.getMeta(),
    }
  }

  async stats() {
    const now = DateTime.now().toISO()
    const [row] = await db
      .from('surveys')
      .where('tenant_id', this.tenant.id)
      .select(
        db.raw('count(*) filter (where published_at is null) as drafts'),
        db.raw('count(*) filter (where published_at is not null and closes_at > ?) as open', [now]),
        db.raw('count(*) filter (where published_at is not null and closes_at <= ?) as closed', [
          now,
        ])
      )
    return { drafts: num(row.drafts), open: num(row.open), closed: num(row.closed) }
  }

  async detail(survey: Survey): Promise<SurveyDetail> {
    const questions = await this.questionsOf(survey)
    if (survey.createdById) await survey.load('createdBy')
    const results = survey.publishedAt ? await this.results(survey, questions) : null
    return {
      ...this.item(survey, questions.length),
      questions,
      results,
      participation: results?.participation,
      createdBy: survey.createdBy?.fullName ?? null,
    }
  }

  /** The units that voted; what each chose only in a nominal survey */
  async voters(survey: Survey): Promise<SurveyVoter[]> {
    const responses = await SurveyResponse.query()
      .where('tenant_id', this.tenant.id)
      .where('survey_id', survey.id)
      .preload('unit', (q) => q.preload('building'))
      .preload('user')
      .orderBy('created_at', 'desc')
    const answers = new Map<string, Record<string, string>>()
    if (!survey.anonymous) {
      const rows = await db
        .from('survey_answers as a')
        .join('survey_responses as r', 'r.id', 'a.response_id')
        .where('a.tenant_id', this.tenant.id)
        .where('r.survey_id', survey.id)
        .select('a.response_id', 'a.question_id', 'a.option_id')
      for (const row of rows) {
        const map = answers.get(row.response_id) ?? {}
        map[row.question_id] = row.option_id
        answers.set(row.response_id, map)
      }
    }
    return responses.map((response) => ({
      unit: {
        id: response.unit.id,
        code: response.unit.code,
        type: response.unit.type,
        building: response.unit.building
          ? { id: response.unit.building.id, name: response.unit.building.name }
          : null,
      },
      coefficient: num(response.coefficient),
      votedBy: response.user?.fullName ?? null,
      votedAt: response.createdAt.toISO()!,
      answers: survey.anonymous ? null : (answers.get(response.id) ?? {}),
    }))
  }

  /* ------------------------------------------------------------------ */
  /* Writing (the administration)                                        */
  /* ------------------------------------------------------------------ */

  private validate(input: SurveyInput) {
    const closesAt = DateTime.fromISO(input.closesAt)
    if (!closesAt.isValid) throw new FieldException('closesAt', 'Fecha límite inválida')
    if (!input.questions.length)
      throw new FieldException('questions', 'Agrega al menos una pregunta')
    input.questions.forEach((question, index) => {
      const labels = question.options.map((option) => option.trim().toLowerCase())
      if (labels.length < 2) {
        throw new FieldException(
          `questions.${index}.options`,
          'Cada pregunta necesita al menos dos opciones'
        )
      }
      if (new Set(labels).size !== labels.length) {
        throw new FieldException(`questions.${index}.options`, 'Hay opciones repetidas')
      }
    })
    return closesAt
  }

  private async saveQuestions(survey: Survey, input: SurveyInput, trx: TransactionClientContract) {
    await trx.from('survey_questions').where('survey_id', survey.id).delete()
    for (const [index, question] of input.questions.entries()) {
      const created = await SurveyQuestion.create(
        {
          tenantId: this.tenant.id,
          surveyId: survey.id,
          position: index + 1,
          text: question.text.trim(),
          description: question.description?.trim() || null,
        },
        { client: trx }
      )
      await SurveyOption.createMany(
        question.options.map((label, position) => ({
          tenantId: this.tenant.id,
          questionId: created.id,
          position: position + 1,
          label: label.trim(),
        })),
        { client: trx }
      )
    }
  }

  private columns(input: SurveyInput, closesAt: DateTime) {
    return {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      closesAt,
      anonymous: input.anonymous,
      resultsVisibility: input.resultsVisibility,
      minParticipation: input.minParticipation === null ? null : String(input.minParticipation),
    }
  }

  async create(input: SurveyInput, userId: string) {
    const closesAt = this.validate(input)
    return db.transaction(async (trx) => {
      const survey = await Survey.create(
        {
          ...this.columns(input, closesAt),
          tenantId: this.tenant.id,
          createdById: userId,
          updatedById: userId,
        },
        { client: trx }
      )
      await this.saveQuestions(survey, input, trx)
      return survey
    })
  }

  async update(id: string, input: SurveyInput, userId: string) {
    const survey = await this.find(id)
    if (survey.publishedAt) {
      throw ResourceException.conflict('La encuesta ya se publicó: no se puede modificar')
    }
    const closesAt = this.validate(input)
    await db.transaction(async (trx) => {
      survey.useTransaction(trx)
      survey.merge({ ...this.columns(input, closesAt), updatedById: userId })
      await survey.save()
      await this.saveQuestions(survey, input, trx)
    })
    return survey
  }

  async remove(id: string) {
    const survey = await this.find(id)
    if (survey.publishedAt) {
      throw ResourceException.conflict(
        'Solo se eliminan borradores: una encuesta publicada queda en el histórico'
      )
    }
    await survey.delete()
  }

  async publish(id: string, userId: string, notify: boolean) {
    const survey = await this.find(id)
    if (survey.publishedAt) throw ResourceException.conflict('La encuesta ya está publicada')
    const now = DateTime.now()
    if (survey.closesAt < now.plus({ minutes: MIN_OPEN_MINUTES })) {
      throw new FieldException(
        'closesAt',
        'La fecha límite debe ser al menos una hora después de publicar: cámbiala antes'
      )
    }
    const counts = await this.questionCounts([survey.id])
    if (!counts.get(survey.id)) throw ResourceException.conflict('La encuesta no tiene preguntas')
    survey.merge({ publishedAt: now, opensAt: now, updatedById: userId })
    await survey.save()
    const notified = notify ? await this.notifyPublished(survey) : 0
    return { survey, notified }
  }

  /* ------------------------------------------------------------------ */
  /* The owners                                                          */
  /* ------------------------------------------------------------------ */

  private async residentUnits(surveyIds: string[], owned: OwnedUnit[]) {
    const responses =
      surveyIds.length && owned.length
        ? await SurveyResponse.query()
            .where('tenant_id', this.tenant.id)
            .whereIn('survey_id', surveyIds)
            .whereIn(
              'unit_id',
              owned.map((u) => u.id)
            )
            .preload('user')
        : []
    return (surveyId: string): ResidentSurveyUnit[] =>
      owned.map(({ coefficient, ...unit }) => {
        const response = responses.find((r) => r.surveyId === surveyId && r.unitId === unit.id)
        return {
          unit,
          coefficient,
          votedAt: response?.createdAt.toISO() ?? null,
          votedBy: response?.user?.fullName ?? null,
        }
      })
  }

  private residentItem(
    survey: Survey,
    questionCount: number,
    units: ResidentSurveyUnit[]
  ): ResidentSurveyItem {
    const status = survey.status
    const voted = units.some((u) => u.votedAt)
    return {
      ...this.item(survey, questionCount),
      units,
      canVote: status === 'open' && units.some((u) => !u.votedAt),
      canSeeResults: canSeeResults(status, survey.resultsVisibility, voted),
    }
  }

  /** Published surveys for an owner: open ones first, then the history */
  async residentList(userId: string) {
    const owned = await this.ownedUnits(userId)
    if (!owned.length) return { data: [] as ResidentSurveyItem[], isOwner: false }
    const surveys = await Survey.query()
      .where('tenant_id', this.tenant.id)
      .whereNotNull('published_at')
      .orderByRaw('closes_at > now() desc')
      .orderBy('closes_at', 'desc')
      .limit(200)
    const ids = surveys.map((s) => s.id)
    const [counts, unitsOf] = await Promise.all([
      this.questionCounts(ids),
      this.residentUnits(ids, owned),
    ])
    return {
      data: surveys.map((survey) =>
        this.residentItem(survey, counts.get(survey.id) ?? 0, unitsOf(survey.id))
      ),
      isOwner: true,
    }
  }

  async residentDetail(id: string, userId: string): Promise<ResidentSurveyDetail> {
    const owned = await this.ownedUnits(userId)
    const survey = await this.find(id)
    if (!survey.publishedAt || !owned.length)
      throw ResourceException.notFound('La encuesta no existe')
    const questions = await this.questionsOf(survey)
    const unitsOf = await this.residentUnits([survey.id], owned)
    const item = this.residentItem(survey, questions.length, unitsOf(survey.id))
    return {
      ...item,
      questions,
      results: item.canSeeResults ? await this.results(survey, questions) : null,
    }
  }

  /** One vote per chosen unit with the same answers. Votes are final. */
  async vote(id: string, userId: string, input: SurveyVoteInput) {
    const owned = await this.ownedUnits(userId)
    const survey = await this.find(id)
    if (!survey.publishedAt || !owned.length)
      throw ResourceException.notFound('La encuesta no existe')
    if (survey.status !== 'open') throw ResourceException.conflict('La encuesta está cerrada')

    const unitIds = [...new Set(input.unitIds)]
    const units = unitIds.map((unitId) => owned.find((u) => u.id === unitId))
    if (!unitIds.length || units.some((u) => !u)) {
      throw new FieldException(
        'unitIds',
        'Solo puedes votar por las unidades de las que eres propietario'
      )
    }

    const questions = await this.questionsOf(survey)
    for (const question of questions) {
      const optionId = input.answers[question.id]
      if (!optionId) throw new FieldException(`answers.${question.id}`, 'Responde esta pregunta')
      if (!question.options.some((o) => o.id === optionId)) {
        throw new FieldException(`answers.${question.id}`, 'Opción inválida')
      }
    }
    const extra = Object.keys(input.answers).find(
      (questionId) => !questions.some((q) => q.id === questionId)
    )
    if (extra) throw new FieldException('answers', 'Hay respuestas de otra encuesta')

    try {
      await db.transaction(async (trx) => {
        // Serializes the votes of a survey: the deadline is checked inside the lock
        const locked = await trx
          .from('surveys')
          .where('id', survey.id)
          .forUpdate()
          .select('closes_at')
          .first()
        if (DateTime.fromJSDate(locked.closes_at) <= DateTime.now()) {
          throw ResourceException.conflict('La encuesta acaba de cerrar')
        }
        for (const unit of units as OwnedUnit[]) {
          const response = await SurveyResponse.create(
            {
              tenantId: this.tenant.id,
              surveyId: survey.id,
              unitId: unit.id,
              userId,
              coefficient: String(unit.coefficient),
            },
            { client: trx }
          )
          if (!survey.anonymous) {
            await trx.table('survey_answers').multiInsert(
              questions.map((question) => ({
                tenant_id: this.tenant.id,
                response_id: response.id,
                question_id: question.id,
                option_id: input.answers[question.id],
              }))
            )
          }
          // The results: only totals, so an anonymous vote leaves no trace of its own
          for (const question of questions) {
            await trx.rawQuery(
              `INSERT INTO survey_tallies (tenant_id, survey_id, question_id, option_id, votes, coefficient)
               VALUES (?, ?, ?, ?, 1, ?)
               ON CONFLICT (survey_id, option_id)
               DO UPDATE SET votes = survey_tallies.votes + 1,
                             coefficient = survey_tallies.coefficient + EXCLUDED.coefficient`,
              [this.tenant.id, survey.id, question.id, input.answers[question.id], unit.coefficient]
            )
          }
        }
      })
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw ResourceException.conflict('Alguna de esas unidades ya votó')
      }
      throw error
    }
    return this.residentDetail(survey.id, userId)
  }

  /* ------------------------------------------------------------------ */
  /* Notifications                                                       */
  /* ------------------------------------------------------------------ */

  private closesLabel(survey: Survey) {
    return survey.closesAt
      .setZone(this.tenant.timezone)
      .setLocale('es-CO')
      .toFormat("d 'de' LLLL 'a las' h:mm a")
  }

  private async notifyPublished(survey: Survey) {
    const owners = await this.ownerIds()
    const body = `Responde antes del ${this.closesLabel(survey)}. Tu opinión ayuda a preparar la asamblea.`
    return new NotificationService(this.tenant).notify(owners, {
      app: 'web',
      category: 'surveys',
      type: 'survey.published',
      title: `Nueva encuesta: ${survey.title}`,
      body,
      path: `/encuestas/${survey.id}`,
      dedupeKey: `survey:${survey.id}`,
      email: {
        paragraphs: [survey.description ?? '', body].filter(Boolean),
        action: 'Responder la encuesta',
      },
    })
  }

  /** Owners of the units that have not voted, once, a day before closing */
  async remindClosing(now = DateTime.now()) {
    const surveys = await Survey.query()
      .where('tenant_id', this.tenant.id)
      .whereNotNull('published_at')
      .whereNull('reminded_at')
      .where('closes_at', '>', now.toISO()!)
      .where('closes_at', '<=', now.plus({ hours: SURVEY_REMINDER_HOURS }).toISO()!)
    let sent = 0
    for (const survey of surveys) {
      survey.remindedAt = now
      await survey.save()
      const pending = await this.eligibleUnits()
        .whereNotExists((q) =>
          q
            .from('survey_responses as r')
            .whereColumn('r.unit_id', 'units.id')
            .where('r.survey_id', survey.id)
        )
        .select('id')
      if (!pending.length) continue
      const owners = await this.ownerIds(pending.map((row) => row.id as string))
      const body = `La encuesta cierra el ${this.closesLabel(survey)} y tu unidad aún no ha respondido.`
      sent += await new NotificationService(this.tenant).notify(owners, {
        app: 'web',
        category: 'surveys',
        type: 'survey.reminder',
        title: `Última oportunidad: ${survey.title}`,
        body,
        path: `/encuestas/${survey.id}`,
        dedupeKey: `survey:reminder:${survey.id}`,
        email: { paragraphs: [body], action: 'Responder la encuesta' },
      })
    }
    return sent
  }
}

export function canSeeResults(
  status: SurveyStatus,
  visibility: Survey['resultsVisibility'],
  voted: boolean
) {
  if (status === 'closed') return true
  return status === 'open' && visibility === 'after_vote' && voted
}

/** Hourly: reminder of the surveys that close within a day */
export async function remindClosingSurveys() {
  const now = DateTime.now()
  const rows = await db
    .from('surveys')
    .whereNotNull('published_at')
    .whereNull('reminded_at')
    .where('closes_at', '>', now.toISO()!)
    .where('closes_at', '<=', now.plus({ hours: SURVEY_REMINDER_HOURS }).toISO()!)
    .distinct('tenant_id')
  for (const row of rows) {
    try {
      const tenant = await Tenant.findOrFail(row.tenant_id)
      if (tenant.status !== 'active' && tenant.status !== 'trial') continue
      await new SurveysService(tenant).remindClosing(now)
    } catch (err) {
      logger.error({ err, tenantId: row.tenant_id }, 'could not remind closing surveys')
    }
  }
}
