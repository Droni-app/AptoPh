import type { HttpContext } from '@adonisjs/core/http'
import Attachment from '#models/files/attachment'
import Announcement from '#models/announcements/announcement'
import Tenant from '#models/tenants/tenant'
import { AttachmentsService } from '#services/files/attachments'
import { verifySignature } from '#services/secure_token'

/**
 * GET /api/v1/public/announcement-images/:id?s=… — the image of a comunicado as
 * linked from its email (emailImageUrl). No session: the HMAC signature proves the
 * link came from an email of ours. Redirects to a fresh signed link of the drive
 * while the image and its comunicado still exist.
 */
export default class AnnouncementImagesController {
  async show({ params, request, response }: HttpContext) {
    const signature = String(request.qs().s ?? '')
    if (!signature || !verifySignature('announcement-image', params.id, signature)) {
      return response.notFound({ errors: [{ message: 'La imagen no existe' }] })
    }
    const image = await Attachment.query()
      .where('id', params.id)
      .where('owner_type', 'announcement_image')
      .whereNull('deleted_at')
      .first()
    const announcement =
      image &&
      (await Announcement.query()
        .where('id', image.ownerId)
        .where('tenant_id', image.tenantId)
        .whereNull('deleted_at')
        .first())
    if (!image || !announcement) {
      return response.notFound({ errors: [{ message: 'La imagen no existe' }] })
    }
    const tenant = await Tenant.findOrFail(image.tenantId)
    const url = await new AttachmentsService(tenant).url(image)
    // Short cache: the link it points to expires in minutes
    response.header('Cache-Control', 'private, max-age=300')
    return response.redirect(url)
  }
}
