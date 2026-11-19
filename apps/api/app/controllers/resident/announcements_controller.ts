import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import ResourceException from '#exceptions/resource_exception'
import type Announcement from '#models/announcement'
import { AnnouncementsService, inAudience, targetOf } from '#services/announcements'
import { AttachmentsService } from '#services/attachments'
import { serializeResidentAnnouncement } from '#transformers/announcement_transformer'
import { serializeAttachment } from '#transformers/attachment_transformer'
import { attachmentUrlValidator } from '#validators/attachment'

/** Published announcements addressed to the resident, pinned first */
async function visibleAnnouncements(service: AnnouncementsService, userId: string) {
  const facts = await service.factsOf(userId)
  const rows = await service
    .query()
    .where('published_at', '<=', DateTime.now().toSQL())
    .orderBy('is_pinned', 'desc')
    .orderBy('published_at', 'desc')
    .limit(300)
  return rows.filter((row) => inAudience(facts, targetOf(row)))
}

async function readsOf(tenantId: string, userId: string, ids: string[]) {
  const reads = new Map<string, string>()
  if (ids.length === 0) return reads
  const rows = await db
    .from('announcement_reads')
    .where('tenant_id', tenantId)
    .where('user_id', userId)
    .whereIn('announcement_id', ids)
    .select('announcement_id', 'read_at')
  for (const row of rows) reads.set(row.announcement_id, DateTime.fromJSDate(row.read_at).toISO()!)
  return reads
}

/** A published announcement addressed to the resident, or 404 */
async function findVisible(service: AnnouncementsService, userId: string, id: string) {
  const announcement = await service
    .query()
    .where('id', id)
    .where('published_at', '<=', DateTime.now().toSQL())
    .first()
  if (!announcement || !inAudience(await service.factsOf(userId), targetOf(announcement)))
    throw ResourceException.notFound('El comunicado no existe')
  return announcement
}

/** Comunicados in the residents' portal. docs/announcements.md */
export default class AnnouncementsController {
  async index({ tenant, auth }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const service = new AnnouncementsService(tenant)
    const rows = await visibleAnnouncements(service, userId)
    const ids = rows.map((row) => row.id)
    const [reads, counts] = await Promise.all([
      readsOf(tenant.id, userId, ids),
      service.attachmentCounts(ids),
    ])
    return {
      data: rows.map((row: Announcement) =>
        serializeResidentAnnouncement(row, {
          readAt: reads.get(row.id) ?? null,
          attachmentCount: counts.get(row.id) ?? 0,
        })
      ),
    }
  }

  /** Opening it marks it as read */
  async show({ tenant, auth, params }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const service = new AnnouncementsService(tenant)
    const announcement = await findVisible(service, userId, params.id)
    await service.markRead(announcement, userId)
    const [reads, attachments] = await Promise.all([
      readsOf(tenant.id, userId, [announcement.id]),
      new AttachmentsService(tenant).list('announcement', announcement.id),
    ])
    return {
      data: {
        ...serializeResidentAnnouncement(announcement, {
          readAt: reads.get(announcement.id) ?? null,
          attachmentCount: attachments.length,
        }),
        attachments: attachments.map(serializeAttachment),
      },
    }
  }

  async attachmentUrl({ tenant, auth, params, request }: HttpContext) {
    const { download } = await request.validateUsing(attachmentUrlValidator, {
      data: request.qs(),
    })
    const attachments = new AttachmentsService(tenant)
    const attachment = await attachments.find(params.id, ['announcement'])
    await findVisible(new AnnouncementsService(tenant), auth.getUserOrFail().id, attachment.ownerId)
    return { data: { url: await attachments.url(attachment, download ?? false) } }
  }
}
