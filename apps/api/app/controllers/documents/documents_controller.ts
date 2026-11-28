import type { HttpContext } from '@adonisjs/core/http'
import type { DocumentInput } from '@aptoph/shared'
import { DocumentsService } from '#services/documents/documents'
import {
  documentFileUrlValidator,
  documentFileValidator,
  documentFolderValidator,
  documentListValidator,
  documentValidator,
  newDocumentValidator,
  publishDocumentValidator,
} from '#validators/documents/documents'

/**
 * Documents of the conjunto (docs/documents.md). Everyone enrolled reads
 * what their role and units allow; the administration manages.
 *
 *   GET    /documents  /documents/folders  /documents/stats  /documents/:id
 *   GET    /documents/files/:id/url            signed link, logged
 *   POST   /documents (multipart)              PUT /documents/:id
 *   POST   /documents/:id/versions             DELETE /documents/versions/:id
 *   POST   /documents/:id/publish|unpublish|archive|restore
 *   DELETE /documents/:id
 *   POST   /documents/folders  PUT|DELETE /documents/folders/:id
 */
export default class DocumentsController {
  /** The portal always looks as a resident, even for an administrator */
  protected portal = false

  protected service(ctx: HttpContext) {
    return new DocumentsService(ctx.tenant)
  }

  protected viewer(ctx: HttpContext) {
    return this.service(ctx).viewer(ctx.auth.getUserOrFail().id, ctx.tenantRoles, this.portal)
  }

  private async one(ctx: HttpContext, id: string) {
    const viewer = await this.viewer(ctx)
    const service = this.service(ctx)
    return service.detail(await service.find(id, viewer), viewer)
  }

  async index(ctx: HttpContext) {
    const filters = await ctx.request.validateUsing(documentListValidator, {
      data: ctx.request.qs(),
    })
    const viewer = await this.viewer(ctx)
    return this.service(ctx).list(viewer, {
      ...filters,
      folderId:
        filters.folder === undefined
          ? undefined
          : filters.folder === 'root'
            ? null
            : filters.folder,
    })
  }

  async folders(ctx: HttpContext) {
    return { data: await this.service(ctx).folders(await this.viewer(ctx)) }
  }

  async stats(ctx: HttpContext) {
    return { data: await this.service(ctx).stats() }
  }

  async show(ctx: HttpContext) {
    return { data: await this.one(ctx, ctx.params.id) }
  }

  async fileUrl(ctx: HttpContext) {
    const { download } = await ctx.request.validateUsing(documentFileUrlValidator, {
      data: ctx.request.qs(),
    })
    const url = await this.service(ctx).fileUrl(
      ctx.params.id,
      await this.viewer(ctx),
      download ?? false
    )
    return { data: { url } }
  }

  async store(ctx: HttpContext) {
    const { file, publish, notify, ...input } =
      await ctx.request.validateUsing(newDocumentValidator)
    const service = this.service(ctx)
    const viewer = await this.viewer(ctx)
    const document = await service.create(this.input(input), file, viewer.userId)
    let notified = 0
    if (publish) {
      const result = await service.publish(document.id, viewer, notify ?? false)
      notified = result.notified
    }
    ctx.response.status(201)
    return { data: await this.one(ctx, document.id), notified }
  }

  async update(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(documentValidator)
    await this.service(ctx).update(ctx.params.id, this.input(input), await this.viewer(ctx))
    return { data: await this.one(ctx, ctx.params.id) }
  }

  private input(
    input: Partial<DocumentInput> & Pick<DocumentInput, 'title' | 'category' | 'visibility'>
  ): DocumentInput {
    return {
      title: input.title,
      category: input.category,
      visibility: input.visibility,
      description: input.description ?? null,
      reference: input.reference ?? null,
      documentDate: input.documentDate ?? null,
      expiresOn: input.expiresOn ?? null,
      folderId: input.folderId ?? null,
      vendorId: input.vendorId ?? null,
      unitIds: input.unitIds ?? [],
    }
  }

  async addVersion(ctx: HttpContext) {
    const { file } = await ctx.request.validateUsing(documentFileValidator)
    await this.service(ctx).addVersion(ctx.params.id, file, await this.viewer(ctx))
    ctx.response.status(201)
    return { data: await this.one(ctx, ctx.params.id) }
  }

  async removeVersion(ctx: HttpContext) {
    const document = await this.service(ctx).removeVersion(ctx.params.id, await this.viewer(ctx))
    return { data: await this.one(ctx, document.id) }
  }

  async publish(ctx: HttpContext) {
    const { notify } = await ctx.request.validateUsing(publishDocumentValidator)
    const { notified } = await this.service(ctx).publish(
      ctx.params.id,
      await this.viewer(ctx),
      notify ?? false
    )
    return { data: await this.one(ctx, ctx.params.id), notified }
  }

  async unpublish(ctx: HttpContext) {
    await this.service(ctx).unpublish(ctx.params.id, await this.viewer(ctx))
    return { data: await this.one(ctx, ctx.params.id) }
  }

  async archive(ctx: HttpContext) {
    await this.service(ctx).archive(ctx.params.id, await this.viewer(ctx), true)
    return { data: await this.one(ctx, ctx.params.id) }
  }

  async restore(ctx: HttpContext) {
    await this.service(ctx).archive(ctx.params.id, await this.viewer(ctx), false)
    return { data: await this.one(ctx, ctx.params.id) }
  }

  async destroy(ctx: HttpContext) {
    await this.service(ctx).remove(ctx.params.id, await this.viewer(ctx))
    return ctx.response.noContent()
  }

  async storeFolder(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(documentFolderValidator)
    const folder = await this.service(ctx).createFolder({
      name: input.name,
      parentId: input.parentId ?? null,
    })
    ctx.response.status(201)
    return {
      data: { id: folder.id, name: folder.name, parentId: folder.parentId, documentCount: 0 },
    }
  }

  async updateFolder(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(documentFolderValidator)
    const folder = await this.service(ctx).updateFolder(ctx.params.id, {
      name: input.name,
      parentId: input.parentId ?? null,
    })
    return { data: { id: folder.id, name: folder.name, parentId: folder.parentId } }
  }

  async destroyFolder(ctx: HttpContext) {
    await this.service(ctx).removeFolder(ctx.params.id)
    return ctx.response.noContent()
  }
}
