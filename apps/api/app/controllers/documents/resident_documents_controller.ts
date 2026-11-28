import DocumentsController from '#controllers/documents/documents_controller'

/**
 * Documents in the portal: what the person sees as a resident or owner, never
 * the drafts or the private ones, even if they also administer.
 */
export default class ResidentDocumentsController extends DocumentsController {
  protected portal = true
}
