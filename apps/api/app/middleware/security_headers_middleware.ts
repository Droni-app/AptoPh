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
    // JSON and PDFs only: nothing of the API should ever run as a page
    response.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
    response.header('Referrer-Policy', 'no-referrer')
    if (app.inProduction) {
      response.header('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
    }
    return next()
  }
}
