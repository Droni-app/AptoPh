import type {
  Announcement as AnnouncementData,
  Attachment as AttachmentData,
  ResidentAnnouncement,
} from '@aptoph/shared'
import type Announcement from '#models/announcement'

const iso = (value: { toISO(): string | null } | null | undefined) => (value ? value.toISO() : null)

export function serializeAnnouncement(
  announcement: Announcement,
  extra: { attachmentCount: number; reads: { read: number; total: number } | null }
): AnnouncementData {
  const buildings = (announcement.$preloaded.buildings ?? []) as unknown as Array<{
    id: string
    name: string
  }>
  const createdBy = announcement.$preloaded.createdBy as unknown as { fullName: string } | undefined
  return {
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    audience: announcement.audience,
    buildings: buildings.map((b) => ({ id: b.id, name: b.name })),
    status: announcement.status,
    publishedAt: iso(announcement.publishedAt),
    isPinned: announcement.isPinned,
    sendEmail: announcement.sendEmail,
    emailedAt: iso(announcement.emailedAt),
    emailCount: announcement.emailCount,
    emailSkipped: announcement.emailSkipped,
    createdBy: createdBy?.fullName ?? null,
    createdAt: announcement.createdAt.toISO()!,
    updatedAt: iso(announcement.updatedAt),
    attachmentCount: extra.attachmentCount,
    reads: extra.reads,
  }
}

export function serializeResidentAnnouncement(
  announcement: Announcement,
  extra: { readAt: string | null; attachmentCount: number }
): ResidentAnnouncement {
  return {
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    publishedAt: announcement.publishedAt!.toISO()!,
    isPinned: announcement.isPinned,
    readAt: extra.readAt,
    attachmentCount: extra.attachmentCount,
  }
}

export type { AttachmentData }
