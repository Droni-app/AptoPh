import { randomUUID } from 'node:crypto'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import string from '@adonisjs/core/helpers/string'
import logger from '@adonisjs/core/services/logger'
import drive from '@adonisjs/drive/services/main'
import { errors as lucidErrors } from '@adonisjs/lucid'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { ATTACHMENT_MAX_PER_OWNER, type AttachmentOwnerType } from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import Attachment from '#models/attachment'
import type Tenant from '#models/tenant'

/** Table that holds each kind of owner */
const OWNER_TABLES: Record<AttachmentOwnerType, string> = {
  bill: 'bills',
  vendor_payment: 'vendor_payments',
  payment: 'payments',
  journal_entry: 'journal_entries',
  announcement: 'announcements',
}

/**
 * Folder of each kind of owner inside the conjunto's folder:
 * `{tenant slug}/{folder}/{yyyy}/{mm}/{uuid}-{name}.{ext}`
 */
const OWNER_FOLDERS: Record<AttachmentOwnerType, string> = {
  bill: 'finanzas/gastos',
  vendor_payment: 'finanzas/pagos-proveedor',
  payment: 'finanzas/recaudos',
  journal_entry: 'finanzas/comprobantes',
  announcement: 'comunicados',
}

/** How long a signed link to a file works */
const SIGNED_URL_TTL = '10m'

/** "Factura EPM (nov).PDF" → "factura-epm-nov.pdf" */
export function safeFileName(clientName: string, extname: string | undefined) {
  const ext = (extname ?? clientName.split('.').pop() ?? '').toLowerCase()
  const base = clientName.replace(/\.[^.]+$/, '')
  const slug = string.slug(base, { lower: true, strict: true }).slice(0, 80) || 'archivo'
  return ext ? `${slug}.${ext}` : slug
}

/** Path of a new file in the drive */
export function fileKeyFor(
  tenant: Tenant,
  ownerType: AttachmentOwnerType,
  clientName: string,
  extname: string | undefined
) {
  const now = DateTime.now().setZone(tenant.timezone || 'America/Bogota')
  return [
    tenant.slug,
    OWNER_FOLDERS[ownerType],
    now.toFormat('yyyy'),
    now.toFormat('MM'),
    `${randomUUID()}-${safeFileName(clientName, extname)}`,
  ].join('/')
}

/**
 * Attachments of the records of a conjunto. The files are private: they are
 * opened through signed URLs that expire.
 */
export class AttachmentsService {
  constructor(private tenant: Tenant) {}

  /** Fails with 404 unless the record exists in this conjunto */
  async assertOwner(ownerType: AttachmentOwnerType, ownerId: string) {
    const row = await db
      .from(OWNER_TABLES[ownerType])
      .where('tenant_id', this.tenant.id)
      .where('id', ownerId)
      .if(ownerType === 'announcement', (q) => q.whereNull('deleted_at'))
      .select('id')
      .first()
    if (!row) throw new lucidErrors.E_ROW_NOT_FOUND()
  }

  list(ownerType: AttachmentOwnerType, ownerId: string | string[]) {
    return Attachment.query()
      .where('tenant_id', this.tenant.id)
      .where('owner_type', ownerType)
      .whereIn('owner_id', Array.isArray(ownerId) ? ownerId : [ownerId])
      .whereNull('deleted_at')
      .preload('uploadedBy')
      .orderBy('created_at')
  }

  /** An active attachment of the conjunto, of one of `ownerTypes` (404 otherwise) */
  find(id: string, ownerTypes: readonly AttachmentOwnerType[]) {
    return Attachment.query()
      .where('tenant_id', this.tenant.id)
      .where('id', id)
      .whereIn('owner_type', [...ownerTypes])
      .whereNull('deleted_at')
      .firstOrFail()
  }

  async upload(
    ownerType: AttachmentOwnerType,
    ownerId: string,
    file: MultipartFile,
    userId: string,
    { max = ATTACHMENT_MAX_PER_OWNER }: { max?: number } = {}
  ) {
    await this.assertOwner(ownerType, ownerId)
    const active = await db
      .from('attachments')
      .where('tenant_id', this.tenant.id)
      .where('owner_type', ownerType)
      .where('owner_id', ownerId)
      .whereNull('deleted_at')
      .count('* as total')
      .first()
    if (Number(active?.total ?? 0) >= max) {
      throw new FieldException(
        'file',
        `Este registro ya tiene ${max} adjuntos, quita alguno antes de subir otro`
      )
    }

    const key = fileKeyFor(this.tenant, ownerType, file.clientName, file.extname)
    const mimeType =
      file.type && file.subtype ? `${file.type}/${file.subtype}` : 'application/octet-stream'
    await file.moveToDisk(key, { contentType: mimeType })

    try {
      const attachment = await Attachment.create({
        tenantId: this.tenant.id,
        ownerType,
        ownerId,
        fileKey: key,
        fileName: file.clientName.slice(0, 255),
        mimeType,
        sizeBytes: file.size,
        uploadedById: userId,
      })
      await attachment.load('uploadedBy')
      return attachment
    } catch (error) {
      // Do not leave an orphan file when the row cannot be saved
      await drive
        .use()
        .delete(key)
        .catch((err) => logger.warn({ err, key }, 'could not delete orphan attachment'))
      throw error
    }
  }

  /** Signed link to view (`inline`) or download the file */
  url(attachment: Attachment, download = false) {
    const disposition = download ? 'attachment' : 'inline'
    const asciiName = attachment.fileName.replace(/[^\x20-\x7e]|["\\]/g, '_')
    return drive.use().getSignedUrl(attachment.fileKey, {
      expiresIn: SIGNED_URL_TTL,
      contentType: attachment.mimeType,
      contentDisposition: `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
    })
  }

  /**
   * Hides the attachment. The file stays in the drive: it is accounting
   * support and the row keeps who removed it and when.
   */
  async remove(attachment: Attachment, userId: string) {
    attachment.deletedAt = DateTime.now()
    attachment.deletedById = userId
    await attachment.save()
  }
}
