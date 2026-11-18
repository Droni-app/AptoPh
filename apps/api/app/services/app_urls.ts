import { BACKOFFICE_ROLES, type EnrollmentRole } from '@aptoph/shared'
import env from '#start/env'

export type ClientApp = 'backoffice' | 'web'

/** Public URL of each web app, for links sent by email */
export function appUrl(app: ClientApp) {
  return app === 'backoffice'
    ? env.get('BACKOFFICE_URL', 'http://localhost:5174')
    : env.get('RESIDENTS_URL', 'http://localhost:5173')
}

/** Staff roles use the back-office; residents use the residents' portal */
export function appForRole(role: EnrollmentRole): ClientApp {
  return BACKOFFICE_ROLES.includes(role) ? 'backoffice' : 'web'
}

/** Absolute link to a page of an app with a token in the query string */
export function tokenLink(app: ClientApp, path: string, token: string) {
  const url = new URL(path, appUrl(app))
  url.searchParams.set('token', token)
  return url.toString()
}
