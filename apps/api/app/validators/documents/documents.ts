import vine from '@vinejs/vine'
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_EXTENSIONS,
  DOCUMENT_MAX_MB,
  DOCUMENT_VISIBILITIES,
} from '@aptoph/shared'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const file = () => vine.file({ size: `${DOCUMENT_MAX_MB}mb`, extnames: [...DOCUMENT_EXTENSIONS] })

const documentFields = {
  title: vine.string().trim().minLength(3).maxLength(200),
  description: vine.string().trim().maxLength(2000).nullable().optional(),
  category: vine.enum(DOCUMENT_CATEGORIES),
  visibility: vine.enum(DOCUMENT_VISIBILITIES),
  reference: vine.string().trim().maxLength(60).nullable().optional(),
  documentDate: vine.string().trim().regex(DATE).nullable().optional(),
  expiresOn: vine.string().trim().regex(DATE).nullable().optional(),
  folderId: vine.string().uuid().nullable().optional(),
  vendorId: vine.string().uuid().nullable().optional(),
  unitIds: vine.array(vine.string().uuid()).maxLength(2000).optional(),
}

export const documentValidator = vine.create(documentFields)

/**
 * New document: multipart with the file and the fields. Arrays arrive as
 * `unitIds[]` and booleans as strings.
 */
export const newDocumentValidator = vine.create({
  ...documentFields,
  file: file(),
  publish: vine.boolean().optional(),
  notify: vine.boolean().optional(),
})

export const documentFileValidator = vine.create({ file: file() })

export const publishDocumentValidator = vine.create({ notify: vine.boolean().optional() })

export const documentListValidator = vine.create({
  search: vine.string().trim().maxLength(100).optional(),
  category: vine.enum(DOCUMENT_CATEGORIES).optional(),
  /** A folder id, or `root` for the documents outside any folder */
  folder: vine.string().trim().optional(),
  status: vine.enum(['draft', 'published', 'archived'] as const).optional(),
  visibility: vine.enum(DOCUMENT_VISIBILITIES).optional(),
  expiring: vine.boolean().optional(),
  year: vine.number().min(1900).max(2200).optional(),
  page: vine.number().min(1).optional(),
  perPage: vine.number().min(1).max(100).optional(),
  /** The portal asks as a resident even when the person also administers */
  portal: vine.boolean().optional(),
})

export const documentFolderValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(100),
  parentId: vine.string().uuid().nullable().optional(),
})

export const documentFileUrlValidator = vine.create({
  download: vine.boolean().optional(),
  portal: vine.boolean().optional(),
})
