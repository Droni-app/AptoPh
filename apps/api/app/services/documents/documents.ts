import type { MultipartFile } from '@adonisjs/core/bodyparser'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'
import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_EXPIRY_WARNINGS,
  DOCUMENT_EXTENSIONS,
  DOCUMENT_MAX_VERSIONS,
  type DocumentAccess,
  type DocumentCategory,
  type DocumentDetail,
  type DocumentFile,
  type DocumentFolder as DocumentFolderData,
  type DocumentFolderInput,
  type DocumentInput,
  type DocumentItem,
  type DocumentStats,
  type DocumentVisibility,
  type EnrollmentRole,
} from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import type Attachment from '#models/files/attachment'
import Document from '#models/documents/document'
import DocumentAccessLog from '#models/documents/document_access_log'
import DocumentFolder from '#models/documents/document_folder'
import Unit from '#models/property/unit'
import Vendor from '#models/finance/vendor'
import Tenant from '#models/tenants/tenant'
import { AttachmentsService } from '#services/files/attachments'
import { NotificationService } from '#services/notifications/notifications'
import { tenantToday } from '#services/resident_scope'

/** Roles that see the documents for owners (besides the owners) */
const OWNERS_ROLES: EnrollmentRole[] = ['council_member', 'fiscal_reviewer', 'accountant']
const COUNCIL_ROLES: EnrollmentRole[] = ['council_member', 'fiscal_reviewer']
const STAFF_ROLES: EnrollmentRole[] = ['staff', 'security_guard']
/** Folders nest up to this depth */
const MAX_FOLDER_DEPTH = 5

/**
 * Who is looking. `manage`: the administration in the backoffice, which sees
 * everything (drafts, archived, private) and the extra fields.
 */
export type DocumentViewer = {
  userId: string
  roles: EnrollmentRole[]
  /** Units the person owns today */
  ownedUnitIds: string[]
  manage: boolean
}

/** The visibilities (besides `units`) a person can read. Must match `audienceOf`. */
export function readableVisibilities(viewer: Pick<DocumentViewer, 'roles' | 'ownedUnitIds'>) {
  const has = (roles: EnrollmentRole[]) => viewer.roles.some((role) => roles.includes(role))
  const result: DocumentVisibility[] = []
  if (viewer.roles.length) result.push('community')
  if (viewer.ownedUnitIds.length || has(OWNERS_ROLES)) result.push('owners')
  if (has(COUNCIL_ROLES)) result.push('council')
  if (has(STAFF_ROLES)) result.push('staff')
  return result
}

type ListFilters = {
  search?: string
  category?: DocumentCategory
  folderId?: string | null
  /** Only the administration */
  status?: 'draft' | 'published' | 'archived'
  visibility?: DocumentVisibility
  expiring?: boolean
  year?: number
  page?: number
  perPage?: number
}

/**
 * The name the person sees and downloads must also be a document: the
 * content check alone would keep "acta.exe" if its bytes were a PDF
 */
function assertFileName(file: MultipartFile) {
  const ext = file.clientName.split('.').pop()?.toLowerCase() ?? ''
  if (!file.clientName.includes('.') || !(DOCUMENT_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new FieldException('file', `Formato no permitido. Usa ${DOCUMENT_EXTENSIONS.join(', ')}`)
  }
}

const iso = (value: DateTime | null | undefined) => value?.toISO() ?? null
const isoDate = (value: DateTime | null | undefined) => value?.toISODate() ?? null

/**
 * Document management of a conjunto (docs/documents.md): folders, documents
 * with versions, who can see each one and the log of who opened them.
 */
export class DocumentsService {
  constructor(private tenant: Tenant) {}

  /* ------------------------------------------------------------------ */
  /* Who sees what                                                       */
  /* ------------------------------------------------------------------ */

  async viewer(userId: string, roles: EnrollmentRole[], portal = false): Promise<DocumentViewer> {
    const today = tenantToday(this.tenant)
    const owned = await db
      .from('unit_occupants as o')
      .join('units as u', (join) =>
        join.on('u.id', 'o.unit_id').andOn('u.tenant_id', 'o.tenant_id')
      )
      .where('o.tenant_id', this.tenant.id)
      .where('o.user_id', userId)
      .where('o.relationship', 'owner')
      .whereNull('u.deleted_at')
      .where((q) => q.whereNull('o.starts_on').orWhere('o.starts_on', '<=', today))
      .where((q) => q.whereNull('o.ends_on').orWhere('o.ends_on', '>=', today))
      .distinct('o.unit_id')
    return {
      userId,
      roles,
      ownedUnitIds: owned.map((row) => row.unit_id as string),
      manage: !portal && roles.includes('administrator'),
    }
  }

  /** Documents of the conjunto the viewer may see */
  visible(viewer: DocumentViewer) {
    const query = Document.query()
      .where('documents.tenant_id', this.tenant.id)
      .whereNull('documents.deleted_at')
    if (viewer.manage) return query
    const visibilities = readableVisibilities(viewer)
    return query
      .whereNotNull('documents.published_at')
      .whereNull('documents.archived_at')
      .where((q) => {
        q.whereRaw('false')
        if (visibilities.length) q.orWhereIn('documents.visibility', visibilities)
        if (viewer.ownedUnitIds.length) {
          q.orWhere((units) =>
            units
              .where('documents.visibility', 'units')
              .whereExists((sub) =>
                sub
                  .from('document_units as du')
                  .whereColumn('du.document_id', 'documents.id')
                  .whereIn('du.unit_id', viewer.ownedUnitIds)
              )
          )
        }
      })
  }

  async find(id: string, viewer: DocumentViewer) {
    const document = await this.withRelations(
      this.visible(viewer).where('documents.id', id),
      viewer
    ).first()
    if (!document) throw ResourceException.notFound('El documento no existe')
    return document
  }

  private withRelations(query: ModelQueryBuilderContract<typeof Document>, viewer: DocumentViewer) {
    query.preload('folder')
    if (viewer.manage) {
      query.preload('vendor').preload('units', (units) => units.preload('building'))
    }
    return query
  }

  /* ------------------------------------------------------------------ */
  /* Reading                                                             */
  /* ------------------------------------------------------------------ */

  async list(viewer: DocumentViewer, filters: ListFilters) {
    const query = this.withRelations(this.visible(viewer), viewer)
    const search = filters.search?.trim()
    if (search) {
      const like = `%${search.replace(/[%_\\]/g, '\\$&')}%`
      query.where((q) =>
        q
          .whereILike('documents.title', like)
          .orWhereILike('documents.description', like)
          .orWhereILike('documents.reference', like)
      )
    }
    if (filters.category) query.where('documents.category', filters.category)
    if (filters.folderId !== undefined) {
      if (filters.folderId === null) query.whereNull('documents.folder_id')
      else query.where('documents.folder_id', filters.folderId)
    }
    if (filters.year) {
      query.whereRaw(
        'extract(year from coalesce(documents.document_date, (documents.created_at at time zone ?)::date)) = ?',
        [this.tenant.timezone, filters.year]
      )
    }
    if (viewer.manage) {
      if (filters.status === 'draft')
        query.whereNull('documents.published_at').whereNull('documents.archived_at')
      if (filters.status === 'published')
        query.whereNotNull('documents.published_at').whereNull('documents.archived_at')
      if (filters.status === 'archived') query.whereNotNull('documents.archived_at')
      if (!filters.status && !filters.expiring) query.whereNull('documents.archived_at')
      if (filters.visibility) query.where('documents.visibility', filters.visibility)
      if (filters.expiring) {
        query
          .whereNull('documents.archived_at')
          .whereNotNull('documents.expires_on')
          .where(
            'documents.expires_on',
            '<=',
            DateTime.fromISO(tenantToday(this.tenant)).plus({ days: 30 }).toISODate()!
          )
      }
    }
    const page = await query
      .orderByRaw(
        filters.expiring
          ? 'documents.expires_on asc'
          : 'coalesce(documents.document_date, documents.created_at::date) desc'
      )
      .orderBy('documents.created_at', 'desc')
      .paginate(filters.page ?? 1, filters.perPage ?? 25)
    const documents = page.all()
    const files = await this.currentFiles(documents.map((d) => d.id))
    const counts = viewer.manage ? await this.counts(documents.map((d) => d.id)) : null
    return {
      data: documents.map((document) =>
        this.present(document, viewer, files.get(document.id) ?? null, counts?.get(document.id))
      ),
      metadata: page.getMeta(),
      /** Categories with something the person can see, for the filter chips */
      categories: await this.categoriesFor(viewer),
    }
  }

  private async categoriesFor(viewer: DocumentViewer) {
    const rows = await this.visible(viewer)
      .whereNull('documents.archived_at')
      .distinct('documents.category')
      .pojo<{ category: DocumentCategory }>()
    return rows.map((row) => row.category)
  }

  async detail(document: Document, viewer: DocumentViewer): Promise<DocumentDetail> {
    const versions = await this.versions(document.id)
    const current = versions[0] ?? null
    const base = this.present(document, viewer, current, {
      versions: versions.length,
      views: viewer.manage ? await this.viewCount(document.id) : 0,
    })
    if (document.uploadedById) await document.load('uploadedBy')
    const detail: DocumentDetail = {
      ...base,
      createdAt: document.createdAt.toISO()!,
      uploadedBy: document.uploadedBy?.fullName ?? null,
    }
    if (viewer.manage) {
      detail.versions = versions.map((version) => ({ ...version, ownerId: document.id }))
      detail.access = await this.accessLog(document.id, versions)
    }
    return detail
  }

  /** Folders the viewer may browse, with what they see inside */
  async folders(viewer: DocumentViewer): Promise<DocumentFolderData[]> {
    const folders = await DocumentFolder.query().where('tenant_id', this.tenant.id).orderBy('name')
    const counts = await this.visible(viewer)
      .whereNotNull('documents.folder_id')
      .groupBy('documents.folder_id')
      .select('documents.folder_id')
      .count('* as total')
    const direct = new Map<string, number>(
      counts.map((row) => [row.folderId!, Number(row.$extras.total)])
    )
    if (viewer.manage) {
      return folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        documentCount: direct.get(folder.id) ?? 0,
      }))
    }
    // Residents only see the folders with something they can open (in it or below)
    const parents = new Map(folders.map((folder) => [folder.id, folder.parentId]))
    const keep = new Set<string>()
    for (const id of direct.keys()) {
      let current: string | null | undefined = id
      for (let depth = 0; current && depth <= MAX_FOLDER_DEPTH; depth++) {
        keep.add(current)
        current = parents.get(current)
      }
    }
    return folders
      .filter((folder) => keep.has(folder.id))
      .map((folder) => ({
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        documentCount: direct.get(folder.id) ?? 0,
      }))
  }

  async stats(): Promise<DocumentStats> {
    const limit = DateTime.fromISO(tenantToday(this.tenant)).plus({ days: 30 }).toISODate()!
    const [totals] = await db
      .from('documents')
      .where('tenant_id', this.tenant.id)
      .whereNull('deleted_at')
      .whereNull('archived_at')
      .select(
        db.raw('count(*) as total'),
        db.raw('count(*) filter (where published_at is null) as drafts'),
        db.raw('count(*) filter (where expires_on is not null and expires_on <= ?) as expiring', [
          limit,
        ])
      )
    const byCategory = await db
      .from('documents')
      .where('tenant_id', this.tenant.id)
      .whereNull('deleted_at')
      .whereNull('archived_at')
      .groupBy('category')
      .select('category')
      .count('* as total')
    return {
      total: Number(totals.total),
      drafts: Number(totals.drafts),
      expiring: Number(totals.expiring),
      byCategory: Object.fromEntries(byCategory.map((row) => [row.category, Number(row.total)])),
    }
  }

  /* ------------------------------------------------------------------ */
  /* Files                                                               */
  /* ------------------------------------------------------------------ */

  private fileOf(attachment: Attachment, version: number): DocumentFile {
    const uploadedBy = attachment.$preloaded.uploadedBy as unknown as
      { fullName: string | null } | undefined
    return {
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: Number(attachment.sizeBytes),
      version,
      uploadedAt: attachment.createdAt.toISO()!,
      uploadedBy: uploadedBy?.fullName ?? null,
    }
  }

  /** All the versions of a document, the current (latest) first */
  async versions(documentId: string) {
    const attachments = await new AttachmentsService(this.tenant).list('document', documentId)
    return attachments.map((attachment, index) => this.fileOf(attachment, index + 1)).reverse()
  }

  /** The current file of each document */
  private async currentFiles(documentIds: string[]) {
    const map = new Map<string, DocumentFile>()
    if (!documentIds.length) return map
    const attachments = await new AttachmentsService(this.tenant).list('document', documentIds)
    const versions = new Map<string, number>()
    for (const attachment of attachments) {
      const version = (versions.get(attachment.ownerId) ?? 0) + 1
      versions.set(attachment.ownerId, version)
      map.set(attachment.ownerId, this.fileOf(attachment, version))
    }
    return map
  }

  private async counts(documentIds: string[]) {
    const map = new Map<string, { versions: number; views: number }>()
    if (!documentIds.length) return map
    const [versions, views] = await Promise.all([
      db
        .from('attachments')
        .where('tenant_id', this.tenant.id)
        .where('owner_type', 'document')
        .whereIn('owner_id', documentIds)
        .whereNull('deleted_at')
        .groupBy('owner_id')
        .select('owner_id')
        .count('* as total'),
      db
        .from('document_access_logs')
        .where('tenant_id', this.tenant.id)
        .whereIn('document_id', documentIds)
        .groupBy('document_id')
        .select('document_id')
        .count('* as total'),
    ])
    for (const id of documentIds) map.set(id, { versions: 0, views: 0 })
    for (const row of versions) map.get(row.owner_id)!.versions = Number(row.total)
    for (const row of views) map.get(row.document_id)!.views = Number(row.total)
    return map
  }

  private async viewCount(documentId: string) {
    const row = await db
      .from('document_access_logs')
      .where('tenant_id', this.tenant.id)
      .where('document_id', documentId)
      .count('* as total')
      .first()
    return Number(row?.total ?? 0)
  }

  private async accessLog(documentId: string, versions: DocumentFile[]): Promise<DocumentAccess[]> {
    const logs = await DocumentAccessLog.query()
      .where('tenant_id', this.tenant.id)
      .where('document_id', documentId)
      .preload('user')
      .orderBy('created_at', 'desc')
      .limit(50)
    const byId = new Map(versions.map((version) => [version.id, version]))
    return logs.map((log) => ({
      id: log.id,
      user: { id: log.userId, fullName: log.user.fullName },
      action: log.action,
      fileName: byId.get(log.attachmentId)?.fileName ?? 'Versión retirada',
      version: byId.get(log.attachmentId)?.version ?? 0,
      at: log.createdAt.toISO()!,
    }))
  }

  /**
   * Signed link to a file, logged. Residents only open the current version;
   * the administration opens any.
   */
  async fileUrl(attachmentId: string, viewer: DocumentViewer, download: boolean) {
    const files = new AttachmentsService(this.tenant)
    const attachment = await files.find(attachmentId, ['document'])
    const document = await this.find(attachment.ownerId, viewer)
    if (!viewer.manage) {
      const [current] = await this.versions(document.id)
      if (current?.id !== attachment.id) throw ResourceException.notFound('El archivo no existe')
    }
    await DocumentAccessLog.create({
      tenantId: this.tenant.id,
      documentId: document.id,
      attachmentId: attachment.id,
      userId: viewer.userId,
      action: download ? 'download' : 'view',
    })
    return files.url(attachment, download)
  }

  /* ------------------------------------------------------------------ */
  /* Presentation                                                        */
  /* ------------------------------------------------------------------ */

  present(
    document: Document,
    viewer: DocumentViewer,
    file: DocumentFile | null,
    counts?: { versions: number; views: number }
  ): DocumentItem {
    const folder = document.$preloaded.folder as DocumentFolder | null | undefined
    const item: DocumentItem = {
      id: document.id,
      title: document.title,
      description: document.description,
      category: document.category,
      reference: document.reference,
      documentDate: isoDate(document.documentDate),
      expiresOn: isoDate(document.expiresOn),
      folder: folder ? { id: folder.id, name: folder.name } : null,
      file,
      status: document.status,
      publishedAt: iso(document.publishedAt),
      updatedAt: iso(document.updatedAt),
    }
    if (viewer.manage) {
      const units = (document.$preloaded.units ?? []) as Unit[]
      const vendor = document.$preloaded.vendor as Vendor | null | undefined
      item.visibility = document.visibility
      item.units = units.map((unit) => ({
        id: unit.id,
        code: unit.code,
        type: unit.type,
        building: unit.building ? { id: unit.building.id, name: unit.building.name } : null,
      }))
      item.vendor = vendor ? { id: vendor.id, name: vendor.name } : null
      item.versionCount = counts?.versions ?? (file ? file.version : 0)
      item.viewCount = counts?.views ?? 0
    }
    return item
  }

  /* ------------------------------------------------------------------ */
  /* Writing (the administration)                                        */
  /* ------------------------------------------------------------------ */

  private async values(input: DocumentInput) {
    if (input.folderId) await this.folder(input.folderId)
    if (input.vendorId) {
      const vendor = await Vendor.query()
        .where('tenant_id', this.tenant.id)
        .where('id', input.vendorId)
        .first()
      if (!vendor) throw new FieldException('vendorId', 'El proveedor no existe')
    }
    const unitIds = [...new Set(input.unitIds)]
    if (input.visibility === 'units') {
      if (!unitIds.length)
        throw new FieldException('unitIds', 'Elige las unidades que lo pueden ver')
      const found = await Unit.query()
        .where('tenant_id', this.tenant.id)
        .whereIn('id', unitIds)
        .whereNull('deleted_at')
        .count('* as total')
      if (Number(found[0].$extras.total) !== unitIds.length) {
        throw new FieldException('unitIds', 'Alguna de las unidades no existe')
      }
    }
    if (input.documentDate && input.expiresOn && input.expiresOn < input.documentDate) {
      throw new FieldException(
        'expiresOn',
        'El vencimiento no puede ser antes de la fecha del documento'
      )
    }
    return {
      unitIds: input.visibility === 'units' ? unitIds : [],
      columns: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        category: input.category,
        visibility: input.visibility,
        reference: input.reference?.trim() || null,
        documentDate: input.documentDate ? DateTime.fromISO(input.documentDate) : null,
        expiresOn: input.expiresOn ? DateTime.fromISO(input.expiresOn) : null,
        folderId: input.folderId,
        vendorId: input.vendorId,
      },
    }
  }

  private async syncUnits(document: Document, unitIds: string[]) {
    await document
      .related('units')
      .sync(Object.fromEntries(unitIds.map((id) => [id, { tenant_id: this.tenant.id }])))
  }

  async create(input: DocumentInput, file: MultipartFile, userId: string) {
    assertFileName(file)
    const { columns, unitIds } = await this.values(input)
    const document = await Document.create({
      ...columns,
      tenantId: this.tenant.id,
      uploadedById: userId,
      updatedById: userId,
    })
    try {
      await this.syncUnits(document, unitIds)
      await new AttachmentsService(this.tenant).upload('document', document.id, file, userId, {
        max: DOCUMENT_MAX_VERSIONS,
      })
    } catch (error) {
      // Without its file the document is useless: do not leave it behind
      await db.from('document_units').where('document_id', document.id).delete()
      await document.delete()
      throw error
    }
    return document
  }

  async update(id: string, input: DocumentInput, viewer: DocumentViewer) {
    const document = await this.find(id, viewer)
    const { columns, unitIds } = await this.values(input)
    document.merge({ ...columns, updatedById: viewer.userId })
    await document.save()
    await this.syncUnits(document, unitIds)
    return this.find(id, viewer)
  }

  async addVersion(id: string, file: MultipartFile, viewer: DocumentViewer) {
    assertFileName(file)
    const document = await this.find(id, viewer)
    if (document.archivedAt) {
      throw ResourceException.conflict(
        'El documento está archivado: restáuralo para subir otra versión'
      )
    }
    await new AttachmentsService(this.tenant).upload('document', document.id, file, viewer.userId, {
      max: DOCUMENT_MAX_VERSIONS,
    })
    document.updatedById = viewer.userId
    document.updatedAt = DateTime.now()
    await document.save()
    return document
  }

  async removeVersion(attachmentId: string, viewer: DocumentViewer) {
    const files = new AttachmentsService(this.tenant)
    const attachment = await files.find(attachmentId, ['document'])
    const document = await this.find(attachment.ownerId, viewer)
    const versions = await this.versions(document.id)
    if (versions.length <= 1) {
      throw ResourceException.conflict(
        'Es el único archivo del documento: sube otro antes de quitarlo'
      )
    }
    await files.remove(attachment, viewer.userId)
    return document
  }

  async publish(id: string, viewer: DocumentViewer, notify: boolean) {
    const document = await this.find(id, viewer)
    if (document.archivedAt)
      throw ResourceException.conflict('Restaura el documento antes de publicarlo')
    if (document.publishedAt) throw ResourceException.conflict('El documento ya está publicado')
    document.merge({ publishedAt: DateTime.now(), updatedById: viewer.userId })
    await document.save()
    const notified = notify ? await this.notifyPublished(document) : 0
    return { document, notified }
  }

  async unpublish(id: string, viewer: DocumentViewer) {
    const document = await this.find(id, viewer)
    if (!document.publishedAt || document.archivedAt) {
      throw ResourceException.conflict('Solo se retira un documento publicado')
    }
    document.merge({ publishedAt: null, updatedById: viewer.userId })
    await document.save()
    return document
  }

  async archive(id: string, viewer: DocumentViewer, archived: boolean) {
    const document = await this.find(id, viewer)
    document.merge({ archivedAt: archived ? DateTime.now() : null, updatedById: viewer.userId })
    await document.save()
    return document
  }

  /** Deleted for everyone; the files and the access log stay (the row is soft deleted) */
  async remove(id: string, viewer: DocumentViewer) {
    const document = await this.find(id, viewer)
    document.merge({ deletedAt: DateTime.now(), updatedById: viewer.userId })
    await document.save()
  }

  /* ------------------------------------------------------------------ */
  /* Folders                                                             */
  /* ------------------------------------------------------------------ */

  async folder(id: string) {
    const folder = await DocumentFolder.query()
      .where('tenant_id', this.tenant.id)
      .where('id', id)
      .first()
    if (!folder) throw new FieldException('folderId', 'La carpeta no existe')
    return folder
  }

  private async assertFolderName(name: string, parentId: string | null, exceptId?: string) {
    const clash = await DocumentFolder.query()
      .where('tenant_id', this.tenant.id)
      .whereRaw('lower(name) = lower(?)', [name])
      .if(
        parentId,
        (q) => q.where('parent_id', parentId!),
        (q) => q.whereNull('parent_id')
      )
      .if(exceptId, (q) => q.whereNot('id', exceptId!))
      .first()
    if (clash) throw new FieldException('name', 'Ya hay una carpeta con ese nombre aquí')
  }

  /** Depth of a folder (1 at the root); fails when `ancestorOf` would create a cycle */
  private async depthOf(parentId: string | null, movingId?: string) {
    let depth = 1
    let current = parentId
    while (current) {
      if (current === movingId) {
        throw new FieldException('parentId', 'Una carpeta no puede quedar dentro de sí misma')
      }
      const folder = await this.folder(current)
      current = folder.parentId
      depth++
    }
    return depth
  }

  private async subtreeDepth(folderId: string): Promise<number> {
    const children = await DocumentFolder.query()
      .where('tenant_id', this.tenant.id)
      .where('parent_id', folderId)
    let deepest = 0
    for (const child of children) deepest = Math.max(deepest, await this.subtreeDepth(child.id))
    return deepest + 1
  }

  async createFolder(input: DocumentFolderInput) {
    const name = input.name.trim()
    if (input.parentId)
      await this.folder(input.parentId).catch(() => {
        throw new FieldException('parentId', 'La carpeta no existe')
      })
    if ((await this.depthOf(input.parentId)) > MAX_FOLDER_DEPTH) {
      throw new FieldException('parentId', `Las carpetas llegan hasta ${MAX_FOLDER_DEPTH} niveles`)
    }
    await this.assertFolderName(name, input.parentId)
    return DocumentFolder.create({ tenantId: this.tenant.id, name, parentId: input.parentId })
  }

  async updateFolder(id: string, input: DocumentFolderInput) {
    const folder = await this.folder(id).catch(() => {
      throw ResourceException.notFound('La carpeta no existe')
    })
    const name = input.name.trim()
    const depth = await this.depthOf(input.parentId, folder.id)
    if (depth + (await this.subtreeDepth(folder.id)) - 1 > MAX_FOLDER_DEPTH) {
      throw new FieldException('parentId', `Las carpetas llegan hasta ${MAX_FOLDER_DEPTH} niveles`)
    }
    await this.assertFolderName(name, input.parentId, folder.id)
    folder.merge({ name, parentId: input.parentId })
    await folder.save()
    return folder
  }

  /** Only an empty folder is deleted */
  async removeFolder(id: string) {
    const folder = await this.folder(id).catch(() => {
      throw ResourceException.notFound('La carpeta no existe')
    })
    const [children, documents] = await Promise.all([
      db
        .from('document_folders')
        .where('tenant_id', this.tenant.id)
        .where('parent_id', id)
        .count('* as total')
        .first(),
      db
        .from('documents')
        .where('tenant_id', this.tenant.id)
        .where('folder_id', id)
        .whereNull('deleted_at')
        .count('* as total')
        .first(),
    ])
    if (Number(children?.total) || Number(documents?.total)) {
      throw ResourceException.conflict(
        'La carpeta tiene documentos o subcarpetas: muévelos antes de borrarla'
      )
    }
    // Deleted documents still point here: let them go to the root
    await db
      .from('documents')
      .where('tenant_id', this.tenant.id)
      .where('folder_id', id)
      .update({ folder_id: null })
    await folder.delete()
  }

  /* ------------------------------------------------------------------ */
  /* Notifications                                                       */
  /* ------------------------------------------------------------------ */

  /** People who can see a document, by app. Must match `visible`. */
  async audienceOf(document: Document) {
    const today = tenantToday(this.tenant)
    const enrolled = (roles: EnrollmentRole[]) =>
      db
        .from('enrollments')
        .where('tenant_id', this.tenant.id)
        .where('status', 'active')
        .whereIn('role', roles)
        .where((q) => q.whereNull('starts_on').orWhere('starts_on', '<=', today))
        .where((q) => q.whereNull('ends_on').orWhere('ends_on', '>=', today))
        .distinct('user_id')
        .then((rows) => rows.map((row) => row.user_id as string))
    const owners = async (unitIds: string[] | null) => {
      const rows = await db
        .from('unit_occupants as o')
        .join('units as u', (join) =>
          join.on('u.id', 'o.unit_id').andOn('u.tenant_id', 'o.tenant_id')
        )
        .join('enrollments as e', (join) =>
          join.on('e.user_id', 'o.user_id').andOn('e.tenant_id', 'o.tenant_id')
        )
        .where('o.tenant_id', this.tenant.id)
        .where('o.relationship', 'owner')
        .where('e.role', 'resident')
        .where('e.status', 'active')
        .whereNull('u.deleted_at')
        .where((q) => q.whereNull('o.starts_on').orWhere('o.starts_on', '<=', today))
        .where((q) => q.whereNull('o.ends_on').orWhere('o.ends_on', '>=', today))
        .if(unitIds, (q) => q.whereIn('o.unit_id', unitIds!))
        .distinct('o.user_id')
      return rows.map((row) => row.user_id as string)
    }
    switch (document.visibility) {
      case 'community':
        return {
          web: await enrolled(['resident']),
          backoffice: await enrolled([...OWNERS_ROLES, ...STAFF_ROLES]),
        }
      case 'owners':
        return { web: await owners(null), backoffice: await enrolled(OWNERS_ROLES) }
      case 'council':
        return { web: [], backoffice: await enrolled(COUNCIL_ROLES) }
      case 'staff':
        return { web: [], backoffice: await enrolled(STAFF_ROLES) }
      case 'units': {
        await document.load('units')
        return { web: await owners(document.units.map((unit) => unit.id)), backoffice: [] }
      }
      default:
        return { web: [], backoffice: [] }
    }
  }

  /** Bell, email and push to the audience of a document just published */
  private async notifyPublished(document: Document) {
    const { web, backoffice } = await this.audienceOf(document)
    const notifications = new NotificationService(this.tenant)
    const title = `Nuevo documento: ${document.title}`
    const body = [
      DOCUMENT_CATEGORY_LABELS[document.category],
      document.reference,
      document.description,
    ]
      .filter(Boolean)
      .join(' · ')
    const base = {
      category: 'documents' as const,
      type: 'document.published',
      title,
      body,
      dedupeKey: `document:${document.id}`,
      email: { paragraphs: [body], action: 'Ver el documento' },
    }
    const [toWeb, toOffice] = await Promise.all([
      notifications.notify(web, {
        ...base,
        app: 'web',
        path: `/documentos?documento=${document.id}`,
      }),
      notifications.notify(backoffice, {
        ...base,
        app: 'backoffice',
        path: `/documentos?documento=${document.id}`,
      }),
    ])
    return toWeb + toOffice
  }

  /** Warns the administration before a contract, policy or certificate expires */
  async remindExpiring(today = tenantToday(this.tenant)) {
    const day = DateTime.fromISO(today)
    const documents = await Document.query()
      .where('tenant_id', this.tenant.id)
      .whereNull('deleted_at')
      .whereNull('archived_at')
      .whereNotNull('expires_on')
      .where('expires_on', '>=', today)
      .where(
        'expires_on',
        '<=',
        day.plus({ days: Math.max(...DOCUMENT_EXPIRY_WARNINGS) }).toISODate()!
      )
    if (!documents.length) return 0
    const notifications = new NotificationService(this.tenant)
    const admins = await notifications.staffWith(['administrator'])
    let sent = 0
    for (const document of documents) {
      const left = Math.round(document.expiresOn!.diff(day, 'days').days)
      // The tightest warning already reached: 30, 7 or the same day
      const warning = [...DOCUMENT_EXPIRY_WARNINGS].sort((a, b) => a - b).find((w) => left <= w)
      if (warning === undefined) continue
      const when = left === 0 ? 'vence hoy' : left === 1 ? 'vence mañana' : `vence en ${left} días`
      sent += await notifications.notify(admins, {
        app: 'backoffice',
        category: 'documents',
        type: 'document.expiring',
        title: `${document.title} ${when}`,
        body: `${DOCUMENT_CATEGORY_LABELS[document.category]}${document.reference ? ` ${document.reference}` : ''} vence el ${document.expiresOn!.setLocale('es-CO').toFormat("d 'de' LLLL 'de' yyyy")}. Renuévalo o archiva el documento.`,
        path: `/documentos?documento=${document.id}`,
        dedupeKey: `document:expiry:${document.id}:${document.expiresOn!.toISODate()}:${warning}`,
        email: {
          paragraphs: [
            `${document.title} ${when}.`,
            'Gestiona la renovación con tiempo, sube la nueva versión o archiva el documento.',
          ],
          action: 'Ver el documento',
        },
      })
    }
    return sent
  }
}

/** Hourly: expiry warnings of every active conjunto */
export async function remindExpiringDocuments() {
  const tenantIds = await db
    .from('documents')
    .whereNull('deleted_at')
    .whereNull('archived_at')
    .whereNotNull('expires_on')
    .where('expires_on', '>=', DateTime.now().minus({ days: 1 }).toISODate()!)
    .where('expires_on', '<=', DateTime.now().plus({ days: 31 }).toISODate()!)
    .distinct('tenant_id')
  for (const row of tenantIds) {
    try {
      const tenant = await Tenant.findOrFail(row.tenant_id)
      if (tenant.status !== 'active' && tenant.status !== 'trial') continue
      await new DocumentsService(tenant).remindExpiring()
    } catch (err) {
      logger.error({ err, tenantId: row.tenant_id }, 'could not remind expiring documents')
    }
  }
}
