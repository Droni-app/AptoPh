import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * 422 with the same shape as VineJS validation errors, for checks that
 * need the database (e.g. "the building does not belong to this tenant").
 */
export default class FieldException extends Exception {
  static status = 422

  constructor(
    public field: string,
    message: string
  ) {
    super(message, { status: 422, code: 'E_VALIDATION_ERROR' })
  }

  async handle(error: this, ctx: HttpContext) {
    ctx.response
      .status(422)
      .send({ errors: [{ field: error.field, message: error.message, rule: 'database.exists' }] })
  }
}
