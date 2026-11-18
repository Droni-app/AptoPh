import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Security headers for a JSON API. No CSRF protection is needed: the API is stateless
 * (bearer tokens in the Authorization header, no cookies).
 */
export default class SecurityHeadersMiddleware {
  async handle({ response }: HttpContext, next: NextFn) {
    response.header('X-Content-Type-Options', 'nosniff')
    response.header('X-Frame-Options', 'DENY')
    if (app.inProduction) {
      response.header('Strict-Transport-Security', 'max-age=15552000')
    }
    return next()
  }
}
