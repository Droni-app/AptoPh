import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import type { DatabaseQueryBuilderContract } from '@adonisjs/lucid/types/querybuilder'
import { DateTime } from 'luxon'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import {
  BUILDING_AUDIENCES,
  ROLE_LABELS,
  type AnnouncementAudience,
  type AnnouncementImage,
  type AnnouncementInput,
  type EnrollmentRole,
} from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import AnnouncementMail from '#mails/announcements/announcement_mail'
import Announcement from '#models/announcements/announcement'
import Tenant from '#models/tenants/tenant'
import Attachment from '#models/files/attachment'
import { appUrl } from '#services/app_urls'
import { AttachmentsService } from '#services/files/attachments'
import { sanitizeBody } from '#services/announcements/rich_text'
import { signValue } from '#services/secure_token'
import env from '#start/env'
import { EmailQuotaService } from '#services/announcements/email_quota'
import { queueMail } from '#services/mailer'
import { NotificationService } from '#services/notifications/notifications'
import { tenantToday } from '#services/resident_scope'

const STAFF_ROLES: EnrollmentRole[] = ['staff', 'security_guard']

/** What decides whether a person is in an audience */
export type AudienceFacts = {
  roles: EnrollmentRole[]
  /** Active occupancies of non-deleted units */
  occupancies: Array<{ relationship: string; buildingId: string | null }>
}

type AudienceTarget = { audience: AnnouncementAudience; buildingIds: string[] }

/**
 * Whether a person belongs to an audience. Must match `recipientsQuery`.
 *
 *  - all (every tower): everyone enrolled in the conjunto
 *  - all / residents with towers, residents: residents living in a unit (of those towers)
 *  - owners: residents who own a unit (of those towers)
 *  - council, staff: by role
 */
export function inAudience(facts: AudienceFacts, target: AudienceTarget) {
  const { audience, buildingIds } = target
  if (audience === 'council') return facts.roles.includes('council_member')
  if (audience === 'staff') return facts.roles.some((role) => STAFF_ROLES.includes(role))
  if (audience === 'all' && buildingIds.length === 0) return facts.roles.length > 0
  if (!facts.roles.includes('resident')) return false
  return facts.occupancies.some(
    (occupancy) =>
      (audience !== 'owners' || occupancy.relationship === 'owner') &&
      (buildingIds.length === 0 ||
        (occupancy.buildingId !== null && buildingIds.includes(occupancy.buildingId)))
  )
}

/** Active enrollments of a user in the conjunto (subquery) */
function activeEnrollment(query: DatabaseQueryBuilderContract, tenantId: string, today: string) {
  query
    .from('enrollments as e')
    .where('e.tenant_id', tenantId)
    .whereRaw('e.user_id = usr.id')
    .where('e.status', 'active')
    .where((q) => q.whereNull('e.starts_on').orWhere('e.starts_on', '<=', today))
    .where((q) => q.whereNull('e.ends_on').orWhere('e.ends_on', '>=', today))
}

/** Users in the audience of an announcement. Must match `inAudience`. */
export function recipientsQuery(tenant: Tenant, target: AudienceTarget) {
  const { audience, buildingIds } = target
  const today = tenantToday(tenant)
  const query = db.from('users as usr').whereNull('usr.deleted_at')

  const withRoles = (roles: EnrollmentRole[] | null) =>
    query.whereExists((sub) => {
      activeEnrollment(sub, tenant.id, today)
      if (roles) sub.whereIn('e.role', roles)
    })

  if (audience === 'council') return withRoles(['council_member'])
  if (audience === 'staff') return withRoles(STAFF_ROLES)
  if (audience === 'all' && buildingIds.length === 0) return withRoles(null)

  withRoles(['resident'])
  return query.whereExists((sub) => {
    sub
      .from('unit_occupants as o')
      .join('units as u', (join) =>
        join.on('u.id', 'o.unit_id').andOn('u.tenant_id', 'o.tenant_id')
      )
      .where('o.tenant_id', tenant.id)
      .whereRaw('o.user_id = usr.id')
      .whereNull('u.deleted_at')
      .where((q) => q.whereNull('o.starts_on').orWhere('o.starts_on', '<=', today))
      .where((q) => q.whereNull('o.ends_on').orWhere('o.ends_on', '>=', today))
    if (audience === 'owners') sub.where('o.relationship', 'owner')
    if (buildingIds.length) sub.whereIn('u.building_id', buildingIds)
  })
}

export function targetOf(announcement: Announcement): AudienceTarget {
  const buildings = (announcement.$preloaded.buildings ?? []) as unknown as Array<{ id: string }>
  return { audience: announcement.audience, buildingIds: buildings.map((b) => b.id) }
}

/**
 * Comunicados of a conjunto: audience, publication (now or scheduled), email
 * and read report. docs/announcements.md
 */
export class AnnouncementsService {
  constructor(private tenant: Tenant) {}

  /** Roles and occupancies of a user, to filter what they can see */
  async factsOf(userId: string): Promise<AudienceFacts> {
    const today = tenantToday(this.tenant)
    const [enrollments, occupancies] = await Promise.all([
      db
        .from('enrollments')
        .where('tenant_id', this.tenant.id)
        .where('user_id', userId)
        .where('status', 'active')
        .where((q) => q.whereNull('starts_on').orWhere('starts_on', '<=', today))
        .where((q) => q.whereNull('ends_on').orWhere('ends_on', '>=', today))
        .select('role'),
      db
        .from('unit_occupants as o')
        .join('units as u', (join) =>
          join.on('u.id', 'o.unit_id').andOn('u.tenant_id', 'o.tenant_id')
        )
        .where('o.tenant_id', this.tenant.id)
        .where('o.user_id', userId)
        .whereNull('u.deleted_at')
        .where((q) => q.whereNull('o.starts_on').orWhere('o.starts_on', '<=', today))
        .where((q) => q.whereNull('o.ends_on').orWhere('o.ends_on', '>=', today))
        .select('o.relationship', 'u.building_id'),
    ])
    return {
      roles: enrollments.map((row) => row.role),
      occupancies: occupancies.map((row) => ({
        relationship: row.relationship,
        buildingId: row.building_id,
      })),
    }
  }

  query() {
    return Announcement.query()
      .where('tenant_id', this.tenant.id)
      .whereNull('deleted_at')
      .preload('buildings', (q) => q.orderBy('sort_order').orderBy('name'))
      .preload('createdBy')
  }

  async save(input: AnnouncementInput, userId: string, announcement?: Announcement) {
    const buildingIds = BUILDING_AUDIENCES.includes(input.audience)
      ? [...new Set(input.buildingIds)]
      : []
    if (buildingIds.length) {
      const found = await db
        .from('buildings')
        .where('tenant_id', this.tenant.id)
        .whereIn('id', buildingIds)
        .count('* as total')
        .first()
      if (Number(found?.total ?? 0) !== buildingIds.length)
        throw new FieldException('buildingIds', 'Alguna torre no existe')
    }

    const publishedAt = this.publicationOf(input, announcement)
    const body = sanitizeBody(input.body)
    // A published comunicado says something: text, its image or both
    if (publishedAt && !body) {
      const hasImage = announcement && (await this.imageOf(announcement.id))
      if (!hasImage) throw new FieldException('body', 'Escribe el mensaje o agrega una imagen')
    }
    // Not emailed yet, or skipped for lack of quota and asked again
    const emailPending = !announcement?.emailedAt || announcement.emailSkipped
    if (input.sendEmail && publishedAt && emailPending) {
      await this.assertEmailQuota({ audience: input.audience, buildingIds }, publishedAt)
    }
    const record = await db.transaction(async (trx) => {
      const row = announcement ?? new Announcement()
      row.useTransaction(trx)
      row.merge({
        tenantId: this.tenant.id,
        title: input.title,
        body,
        audience: input.audience,
        isPinned: input.isPinned,
        sendEmail: input.sendEmail,
        publishedAt,
      })
      if (announcement?.emailSkipped && input.sendEmail) {
        row.merge({ emailedAt: null, emailCount: null, emailSkipped: false })
      }
      if (!announcement) row.createdById = userId
      await row.save()
      await trx.from('announcement_buildings').where('announcement_id', row.id).delete()
      if (buildingIds.length) {
        await trx.table('announcement_buildings').insert(
          buildingIds.map((buildingId) => ({
            tenant_id: this.tenant.id,
            announcement_id: row.id,
            building_id: buildingId,
          }))
        )
      }
      return row
    })
    dispatchDueAnnouncementEmails().catch(() => {})
    return this.query().where('id', record.id).firstOrFail()
  }

  /** `published_at` for the requested publication */
  private publicationOf(input: AnnouncementInput, current?: Announcement) {
    if (input.publish === 'draft') return null
    if (input.publish === 'now') {
      // Keep the original date when it was already published
      return current?.status === 'published' ? current.publishedAt : DateTime.now()
    }
    if (!input.publishAt) throw new FieldException('publishAt', 'Elige la fecha de publicación')
    const at = DateTime.fromISO(input.publishAt)
    if (!at.isValid) throw new FieldException('publishAt', 'La fecha no es válida')
    if (at < DateTime.now().minus({ minutes: 1 }))
      throw new FieldException('publishAt', 'La fecha de publicación ya pasó')
    if (at > DateTime.now().plus({ years: 1 }))
      throw new FieldException('publishAt', 'Programa la publicación dentro del próximo año')
    return at
  }

  async publishNow(announcement: Announcement) {
    if (announcement.status !== 'published') {
      if (announcement.sendEmail && !announcement.emailedAt) {
        await this.assertEmailQuota(targetOf(announcement), DateTime.now())
      }
      announcement.publishedAt = DateTime.now()
      await announcement.save()
    }
    dispatchDueAnnouncementEmails().catch(() => {})
    return announcement
  }

  /** Back to draft; the email is not sent again if it already went out */
  async unpublish(announcement: Announcement) {
    announcement.publishedAt = null
    await announcement.save()
    return announcement
  }

  async remove(announcement: Announcement) {
    announcement.deletedAt = DateTime.now()
    await announcement.save()
  }

  /** Recipients and reads of published announcements, by id */
  async readStats(announcements: Announcement[]) {
    const stats = new Map<string, { read: number; total: number }>()
    for (const announcement of announcements) {
      if (announcement.status !== 'published') continue
      const row = await recipientsQuery(this.tenant, targetOf(announcement))
        .select(db.raw('count(*)::int as total'))
        .select(
          db.raw(
            'count(*) filter (where exists (select 1 from announcement_reads r where r.announcement_id = ? and r.user_id = usr.id))::int as read',
            [announcement.id]
          )
        )
        .first()
      stats.set(announcement.id, { read: row?.read ?? 0, total: row?.total ?? 0 })
    }
    return stats
  }

  /** Read report: everyone in the audience, read first */
  async readers(announcement: Announcement) {
    const rows = await recipientsQuery(this.tenant, targetOf(announcement))
      .leftJoin('announcement_reads as r', (join) =>
        join.on('r.user_id', 'usr.id').andOnVal('r.announcement_id', announcement.id)
      )
      .select('usr.id', 'usr.full_name', 'r.read_at')
      .orderByRaw('r.read_at DESC NULLS LAST')
      .orderBy('usr.full_name')
    const details = await this.detailsOf(rows.map((row) => row.id))
    return rows.map((row) => ({
      userId: row.id as string,
      fullName: row.full_name as string,
      detail: details.get(row.id) ?? null,
      readAt: row.read_at ? DateTime.fromJSDate(row.read_at).toISO() : null,
    }))
  }

  /** "Torre 1 · 302" for occupants, or their back-office role */
  private async detailsOf(userIds: string[]) {
    const details = new Map<string, string>()
    if (userIds.length === 0) return details
    const today = tenantToday(this.tenant)
    const units = await db
      .from('unit_occupants as o')
      .join('units as u', (join) =>
        join.on('u.id', 'o.unit_id').andOn('u.tenant_id', 'o.tenant_id')
      )
      .leftJoin('buildings as b', 'b.id', 'u.building_id')
      .where('o.tenant_id', this.tenant.id)
      .whereIn('o.user_id', userIds)
      .whereNull('u.deleted_at')
      .where((q) => q.whereNull('o.ends_on').orWhere('o.ends_on', '>=', today))
      .select('o.user_id', 'u.code', 'b.name as building')
      .orderBy('b.name')
      .orderBy('u.code')
    for (const row of units) {
      const label = row.building ? `${row.building} · ${row.code}` : row.code
      const current = details.get(row.user_id)
      details.set(row.user_id, current ? `${current}, ${label}` : label)
    }
    const roles = await db
      .from('enrollments')
      .where('tenant_id', this.tenant.id)
      .whereIn(
        'user_id',
        userIds.filter((id) => !details.has(id))
      )
      .where('status', 'active')
      .whereNot('role', 'resident')
      .select('user_id', 'role')
    for (const row of roles) {
      const label = ROLE_LABELS[row.role as EnrollmentRole]
      const current = details.get(row.user_id)
      details.set(row.user_id, current ? `${current}, ${label}` : label)
    }
    return details
  }

  /** Active attachments per announcement */
  async attachmentCounts(ids: string[]) {
    const counts = new Map<string, number>()
    if (ids.length === 0) return counts
    const rows = await db
      .from('attachments')
      .where('tenant_id', this.tenant.id)
      .where('owner_type', 'announcement')
      .whereIn('owner_id', ids)
      .whereNull('deleted_at')
      .groupBy('owner_id')
      .select('owner_id')
      .count('* as total')
    for (const row of rows) counts.set(row.owner_id, Number(row.total))
    return counts
  }

  /** The active image (poster) of each announcement */
  async images(ids: string[]) {
    const images = new Map<string, Attachment>()
    if (ids.length === 0) return images
    const rows = await Attachment.query()
      .where('tenant_id', this.tenant.id)
      .where('owner_type', 'announcement_image')
      .whereIn('owner_id', ids)
      .whereNull('deleted_at')
      .orderBy('created_at')
    // The newest wins (there is one; replacing removes the previous)
    for (const row of rows) images.set(row.ownerId, row)
    return images
  }

  async imageOf(id: string) {
    const images = await this.images([id])
    return images.get(id)
  }

  /** The image with a signed link to show it (expires in minutes) */
  async imageView(image: Attachment | undefined): Promise<AnnouncementImage | null> {
    if (!image) return null
    return {
      id: image.id,
      fileName: image.fileName,
      url: await new AttachmentsService(this.tenant).url(image),
    }
  }

  /** Signed links to the images of several announcements */
  async imageViews(ids: string[]) {
    const images = await this.images(ids)
    const views = new Map<string, AnnouncementImage>()
    await Promise.all(
      [...images].map(async ([id, image]) => views.set(id, (await this.imageView(image))!))
    )
    return views
  }

  /** Sets (or replaces) the image of the announcement */
  async setImage(announcement: Announcement, file: MultipartFile, userId: string) {
    const attachments = new AttachmentsService(this.tenant)
    const previous = await this.imageOf(announcement.id)
    const image = await attachments.upload('announcement_image', announcement.id, file, userId, {
      max: 2,
    })
    if (previous) await attachments.remove(previous, userId)
    return image
  }

  async removeImage(announcement: Announcement, userId: string) {
    const image = await this.imageOf(announcement.id)
    if (image) await new AttachmentsService(this.tenant).remove(image, userId)
  }

  /** Marks it read by the user, once */
  async markRead(announcement: Announcement, userId: string) {
    await db
      .table('announcement_reads')
      .insert({
        tenant_id: this.tenant.id,
        announcement_id: announcement.id,
        user_id: userId,
        read_at: new Date(),
      })
      .onConflict(['announcement_id', 'user_id'])
      .ignore()
  }

  /** People of an audience the email would reach (they have an email address) */
  /** The audience with email that did not turn off comunicados by email */
  private emailRecipients(target: AudienceTarget) {
    return recipientsQuery(this.tenant, target)
      .whereNotNull('usr.email')
      .whereRaw(
        `coalesce((usr.notification_preferences -> 'announcements' ->> 'email')::boolean, true)`
      )
  }

  /**
   * Bell and push of a published comunicado, to its whole audience (residents
   * to the portal, staff to the back-office). The email goes apart (quota).
   */
  async notifyPublished(announcement: Announcement) {
    await announcement.load('buildings')
    const audience = await recipientsQuery(this.tenant, targetOf(announcement))
      .select('usr.id')
      .select(
        db.raw(
          `exists (select 1 from enrollments e2 where e2.tenant_id = ? and e2.user_id = usr.id and e2.role = 'resident' and e2.status = 'active') as is_resident`,
          [this.tenant.id]
        )
      )
    const notifications = new NotificationService(this.tenant)
    const common = {
      category: 'announcements' as const,
      type: 'announcement.published',
      title: announcement.title,
      body: null,
      dedupeKey: `announcement:${announcement.id}`,
    }
    await notifications.notify(
      audience.filter((row) => row.is_resident).map((row) => row.id as string),
      { ...common, app: 'web', path: `/comunicados/${announcement.id}` }
    )
    await notifications.notify(
      audience.filter((row) => !row.is_resident).map((row) => row.id as string),
      { ...common, app: 'backoffice', path: `/comunicados?id=${announcement.id}` }
    )
  }

  /** Recipients and quota of the month the email would go out (docs/email-quota.md) */
  async emailPreview(target: AudienceTarget, at: DateTime = DateTime.now()) {
    const row = await this.emailRecipients(target).select(db.raw('count(*)::int as total')).first()
    const quota = await new EmailQuotaService(this.tenant).of(at < DateTime.now() ? undefined : at)
    return { recipients: (row?.total as number) ?? 0, quota }
  }

  /** The month's quota must cover the email; otherwise it is published without it */
  private async assertEmailQuota(target: AudienceTarget, at: DateTime) {
    const { recipients, quota } = await this.emailPreview(target, at)
    if (recipients <= quota.available) return
    const month = DateTime.fromISO(`${quota.period}-01`).setLocale('es').toFormat('LLLL')
    throw new FieldException(
      'sendEmail',
      `Le llegaría a ${recipients.toLocaleString('es-CO')} personas y ${quota.available === 1 ? 'queda 1 correo' : `quedan ${quota.available.toLocaleString('es-CO')} correos`} de ${month}. Publícalo sin correo o compra correos adicionales en Plan y facturación.`
    )
  }

  /**
   * Sends the email of a published announcement to its audience. Takes the
   * emails from the month's quota first: null when it does not cover them.
   */
  async sendEmails(announcement: Announcement): Promise<number | null> {
    await announcement.load('buildings')
    const recipients = await this.emailRecipients(targetOf(announcement))
      .select('usr.id', 'usr.full_name', 'usr.email')
      .select(
        db.raw(
          `exists (select 1 from enrollments e2 where e2.tenant_id = ? and e2.user_id = usr.id and e2.role = 'resident' and e2.status = 'active') as is_resident`,
          [this.tenant.id]
        )
      )
    const attachments = await db
      .from('attachments')
      .where('tenant_id', this.tenant.id)
      .where('owner_type', 'announcement')
      .where('owner_id', announcement.id)
      .whereNull('deleted_at')
      .count('* as total')
      .first()
    const attachmentCount = Number(attachments?.total ?? 0)
    const image = await this.imageOf(announcement.id)
    const imageUrl = image ? emailImageUrl(image.id) : null
    if (!(await new EmailQuotaService(this.tenant).reserve(recipients.length))) return null
    for (const recipient of recipients) {
      const url = recipient.is_resident
        ? `${appUrl('web')}/comunicados/${announcement.id}`
        : `${appUrl('backoffice')}/comunicados?id=${announcement.id}`
      queueMail(
        new AnnouncementMail(
          announcement,
          this.tenant,
          { fullName: recipient.full_name, email: recipient.email },
          url,
          attachmentCount,
          imageUrl
        ),
        'announcement'
      )
    }
    return recipients.length
  }
}

/**
 * Link to the image of a comunicado for emails: it does not expire (an email is
 * read days later), so the API checks its signature and redirects to a fresh
 * signed link of the drive. GET /api/v1/public/announcement-images/:id
 */
export function emailImageUrl(attachmentId: string) {
  const url = new URL(`/api/v1/public/announcement-images/${attachmentId}`, env.get('APP_URL'))
  url.searchParams.set('s', signValue('announcement-image', attachmentId))
  return url.toString()
}

let dispatching: Promise<void> | null = null

/**
 * Sends the email of every announcement that is published, asked for it and
 * has not sent it yet (published now, or scheduled and its time came).
 * Each row is claimed atomically, so the email goes out once.
 */
export function dispatchDueAnnouncementEmails() {
  dispatching ??= (async () => {
    try {
      // Bell and push of every comunicado published (now or its scheduled time came), once
      const toNotify = await db.rawQuery(
        `UPDATE announcements SET notified_at = now()
         WHERE notified_at IS NULL AND deleted_at IS NULL
           AND published_at IS NOT NULL AND published_at <= clock_timestamp()
         RETURNING id, tenant_id`
      )
      for (const row of toNotify.rows as Array<{ id: string; tenant_id: string }>) {
        try {
          const tenant = await Tenant.findOrFail(row.tenant_id)
          const announcement = await Announcement.findOrFail(row.id)
          await new AnnouncementsService(tenant).notifyPublished(announcement)
        } catch (err) {
          logger.error({ err, announcementId: row.id }, 'could not notify the announcement')
        }
      }
      const claimed = await db.rawQuery(
        `UPDATE announcements SET emailed_at = now()
         WHERE send_email AND emailed_at IS NULL AND deleted_at IS NULL
           AND published_at IS NOT NULL AND published_at <= clock_timestamp()
         RETURNING id, tenant_id`
      )
      for (const row of claimed.rows as Array<{ id: string; tenant_id: string }>) {
        try {
          const tenant = await Tenant.findOrFail(row.tenant_id)
          const announcement = await Announcement.findOrFail(row.id)
          const sent = await new AnnouncementsService(tenant).sendEmails(announcement)
          announcement.emailCount = sent ?? 0
          announcement.emailSkipped = sent === null
          if (sent === null) {
            logger.warn(
              { announcementId: row.id },
              'announcement not emailed: monthly quota used up'
            )
          }
          await announcement.save()
        } catch (err) {
          logger.error({ err, announcementId: row.id }, 'could not send the announcement emails')
        }
      }
    } catch (err) {
      logger.error({ err }, 'could not dispatch announcement emails')
    } finally {
      dispatching = null
    }
  })()
  return dispatching
}
