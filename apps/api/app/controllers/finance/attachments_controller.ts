import type { HttpContext } from '@adonisjs/core/http'
import { FINANCE_ATTACHMENT_OWNER_TYPES } from '@aptoph/shared'
import { AttachmentsService } from '#services/files/attachments'
import { serializeAttachment } from '#transformers/files/attachment_transformer'
import {
  attachmentOwnerValidator,
  attachmentUrlValidator,
  uploadAttachmentValidator,
} from '#validators/files/attachment'

/**
 * Files attached to finance records: bills, payment vouchers, receipts and
 * journal entries (notas de contabilidad, traslados). docs/files.md
 */
export default class AttachmentsController {
  async index({ tenant, params }: HttpContext) {
    const owner = await attachmentOwnerValidator.validate(params)
    const service = new AttachmentsService(tenant)
    await service.assertOwner(owner.ownerType, owner.ownerId)
    const attachments = await service.list(owner.ownerType, owner.ownerId)
    return { data: attachments.map(serializeAttachment) }
  }

  async store({ tenant, params, request, response, auth }: HttpContext) {
    const owner = await attachmentOwnerValidator.validate(params)
    const { file } = await request.validateUsing(uploadAttachmentValidator)
    const attachment = await new AttachmentsService(tenant).upload(
      owner.ownerType,
      owner.ownerId,
      file,
      auth.getUserOrFail().id
    )
    response.status(201)
    return { data: serializeAttachment(attachment) }
  }

  /** Signed link that expires in a few minutes */
  async url({ tenant, params, request }: HttpContext) {
    const { download } = await request.validateUsing(attachmentUrlValidator, {
      data: request.qs(),
    })
    const service = new AttachmentsService(tenant)
    const attachment = await service.find(params.id, FINANCE_ATTACHMENT_OWNER_TYPES)
    return { data: { url: await service.url(attachment, download ?? false) } }
  }

  async destroy({ tenant, params, response, auth }: HttpContext) {
    const service = new AttachmentsService(tenant)
    const attachment = await service.find(params.id, FINANCE_ATTACHMENT_OWNER_TYPES)
    await service.remove(attachment, auth.getUserOrFail().id)
    response.status(204)
  }
}
