import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import FieldException from '#exceptions/field_exception'
import type Announcement from '#models/announcements/announcement'
import { AnnouncementsService, inAudience, targetOf } from '#services/announcements/announcements'
import { AttachmentsService } from '#services/files/attachments'
import { paginated } from '#transformers/finance/finance'
import { serializeAnnouncement } from '#transformers/announcements/announcement_transformer'
import { serializeAttachment } from '#transformers/files/attachment_transformer'
import {
  announcementValidator,
  emailPreviewValidator,
  listAnnouncementsValidator,
} from '#validators/announcements/announcement'
import { attachmentUrlValidator, uploadAttachmentValidator } from '#validators/files/attachment'

/**
 * Comunicados in the back-office: every back-office role reads them; the
 * administration and the council write them. docs/announcements.md
 */
export default class AnnouncementsController {
  private async present(service: AnnouncementsService, rows: Announcement[]) {
    const ids = rows.map((row) => row.id)
    const [counts, stats] = await Promise.all([
      service.attachmentCounts(ids),
      service.readStats(rows),
    ])
    return (row: Announcement) =>
      serializeAnnouncement(row, {
        attachmentCount: counts.get(row.id) ?? 0,
        reads: stats.get(row.id) ?? null,
      })
  }

  private async detail(
    service: AnnouncementsService,
    tenant: HttpContext['tenant'],
    row: Announcement
  ) {
    const [serialize, attachments] = await Promise.all([
      this.present(service, [row]),
      new AttachmentsService(tenant).list('announcement', row.id),
    ])
    return { ...serialize(row), attachments: attachments.map(serializeAttachment) }
  }

  async index({ tenant, request }: HttpContext) {
    const filters = await request.validateUsing(listAnnouncementsValidator, { data: request.qs() })
    const service = new AnnouncementsService(tenant)
    const now = DateTime.now().toSQL()
    const query = service
      .query()
      .orderByRaw('published_at IS NULL DESC')
      .orderByRaw('COALESCE(published_at, created_at) DESC')
    if (filters.status === 'draft') query.whereNull('published_at')
    if (filters.status === 'scheduled') query.where('published_at', '>', now)
    if (filters.status === 'published') query.where('published_at', '<=', now)
    if (filters.search) query.whereILike('title', `%${filters.search}%`)
    const page = await query.paginate(filters.page ?? 1, filters.perPage ?? 20)
    const serialize = await this.present(service, page.all())
    return paginated(page, serialize)
  }

  async show({ tenant, params, auth }: HttpContext) {
    const service = new AnnouncementsService(tenant)
    const announcement = await service.query().where('id', params.id).firstOrFail()
    // Council and staff read the announcements addressed to them here
    const userId = auth.getUserOrFail().id
    if (
      announcement.status === 'published' &&
      inAudience(await service.factsOf(userId), targetOf(announcement))
    ) {
      await service.markRead(announcement, userId)
    }
    return { data: await this.detail(service, tenant, announcement) }
  }

  async readers({ tenant, params }: HttpContext) {
    const service = new AnnouncementsService(tenant)
    const announcement = await service.query().where('id', params.id).firstOrFail()
    return { data: await service.readers(announcement) }
  }

  async store({ tenant, request, response, auth }: HttpContext) {
    const data = await request.validateUsing(announcementValidator)
    const service = new AnnouncementsService(tenant)
    const announcement = await service.save(
      {
        ...data,
        buildingIds: data.buildingIds ?? [],
        isPinned: data.isPinned ?? false,
        sendEmail: data.sendEmail ?? false,
      },
      auth.getUserOrFail().id
    )
    response.status(201)
    return { data: await this.detail(service, tenant, announcement) }
  }

  async update({ tenant, params, request, auth }: HttpContext) {
    const service = new AnnouncementsService(tenant)
    const current = await service.query().where('id', params.id).firstOrFail()
    const data = await request.validateUsing(announcementValidator)
    const announcement = await service.save(
      {
        ...data,
        buildingIds: data.buildingIds ?? [],
        isPinned: data.isPinned ?? false,
        sendEmail: data.sendEmail ?? false,
      },
      auth.getUserOrFail().id,
      current
    )
    return { data: await this.detail(service, tenant, announcement) }
  }

  /** POST /announcements/email-preview — recipients and quota of the month it would go out */
  async emailPreview({ tenant, request }: HttpContext) {
    const data = await request.validateUsing(emailPreviewValidator)
    const at = data.publishAt ? DateTime.fromISO(data.publishAt) : DateTime.now()
    if (!at.isValid) throw new FieldException('publishAt', 'La fecha no es válida')
    const target = { audience: data.audience, buildingIds: data.buildingIds ?? [] }
    return { data: await new AnnouncementsService(tenant).emailPreview(target, at) }
  }

  async publish({ tenant, params }: HttpContext) {
    const service = new AnnouncementsService(tenant)
    const announcement = await service.query().where('id', params.id).firstOrFail()
    await service.publishNow(announcement)
    return { data: await this.detail(service, tenant, announcement) }
  }

  async unpublish({ tenant, params }: HttpContext) {
    const service = new AnnouncementsService(tenant)
    const announcement = await service.query().where('id', params.id).firstOrFail()
    await service.unpublish(announcement)
    return { data: await this.detail(service, tenant, announcement) }
  }

  async destroy({ tenant, params, response }: HttpContext) {
    const service = new AnnouncementsService(tenant)
    const announcement = await service.query().where('id', params.id).firstOrFail()
    await service.remove(announcement)
    response.status(204)
  }

  async attach({ tenant, params, request, response, auth }: HttpContext) {
    const announcement = await new AnnouncementsService(tenant)
      .query()
      .where('id', params.id)
      .firstOrFail()
    const { file } = await request.validateUsing(uploadAttachmentValidator)
    const attachment = await new AttachmentsService(tenant).upload(
      'announcement',
      announcement.id,
      file,
      auth.getUserOrFail().id
    )
    response.status(201)
    return { data: serializeAttachment(attachment) }
  }

  async attachmentUrl({ tenant, params, request }: HttpContext) {
    const { download } = await request.validateUsing(attachmentUrlValidator, {
      data: request.qs(),
    })
    const service = new AttachmentsService(tenant)
    const attachment = await service.find(params.id, ['announcement'])
    return { data: { url: await service.url(attachment, download ?? false) } }
  }

  async detach({ tenant, params, response, auth }: HttpContext) {
    const service = new AttachmentsService(tenant)
    const attachment = await service.find(params.id, ['announcement'])
    await service.remove(attachment, auth.getUserOrFail().id)
    response.status(204)
  }
}
