import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'

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
    const dbError = toDatabaseError(error)
    if (dbError) {
      return ctx.response.status(dbError.status).send({ errors: [{ message: dbError.message }] })
    }

    // Unexpected failures (errors without an HTTP status: the database driver,
    // the drive, a bug): their message can carry SQL, file paths or the responses
    // of other services. Production answers a generic message with the request
    // id, so the log entry can be found. Errors thrown with a status on purpose
    // (Exception, WompiError…) keep their message for the person.
    const status = (error as { status?: unknown })?.status
    if (!this.debug && typeof status !== 'number') {
      return ctx.response.status(500).send({
        errors: [
          {
            message: 'Ocurrió un error inesperado. Inténtalo de nuevo en unos minutos.',
            requestId: ctx.request.id() ?? null,
          },
        ],
      })
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
