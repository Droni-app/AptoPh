import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Client error with the API's `{ errors: [{ message }] }` shape. Residents get
 * 404 for anything outside their own units, so they cannot probe what exists.
 */
export default class ResourceException extends Exception {
  static notFound(message = 'El registro no existe') {
    return new ResourceException(message, { status: 404, code: 'E_NOT_FOUND' })
  }

  static badRequest(message: string) {
    return new ResourceException(message, { status: 400, code: 'E_BAD_REQUEST' })
  }

  static forbidden(message: string) {
    return new ResourceException(message, { status: 403, code: 'E_FORBIDDEN' })
  }

  static conflict(message: string) {
    return new ResourceException(message, { status: 409, code: 'E_CONFLICT' })
  }

  async handle(error: this, ctx: HttpContext) {
    ctx.response.status(error.status).send({ errors: [{ message: error.message }] })
  }
}
