import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { errors as shieldErrors } from '@adonisjs/shield'
import { pickAuthorizeParams, redirectTo } from '#services/oauth_authorize_request'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    /**
     * Expired/missing CSRF token on the hosted login form: show the form again
     * (keeping the OAuth parameters) instead of redirecting to "/".
     */
    if (
      error instanceof shieldErrors.E_BAD_CSRF_TOKEN &&
      ctx.request.url() === '/oauth/authorize'
    ) {
      const query = new URLSearchParams(pickAuthorizeParams(ctx.request.all()))
      return redirectTo(ctx, `/oauth/authorize?${query.toString()}`)
    }

    const dbError = toDatabaseError(error)
    if (dbError) {
      return ctx.response.status(dbError.status).send({ errors: [{ message: dbError.message }] })
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    /**
     * Constraint violations are client errors, not server failures
     */
    if (toDatabaseError(error)) return

    return super.report(error, ctx)
  }
}

/**
 * Maps PostgreSQL constraint violations to client errors instead of 500s.
 * https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
function toDatabaseError(error: unknown): { status: number; message: string } | null {
  const code = (error as { code?: unknown })?.code
  switch (code) {
    case '23505':
      return { status: 422, message: 'Ya existe un registro con estos datos' }
    case '23001':
    case '23503':
      return {
        status: 409,
        message: 'La operación no es posible porque hay registros relacionados',
      }
    case '23514':
      return { status: 422, message: 'Los datos no cumplen las reglas de validación' }
    case '23P01':
      return { status: 409, message: 'El registro se cruza con otro existente' }
    default:
      return null
  }
}
