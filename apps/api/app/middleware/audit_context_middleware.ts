import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { runWithAuditContext } from '#services/audit/context'

/**
 * Makes the request available to the audit log hooks (docs/audit.md), so every
 * change records who made it and from which IP.
 */
export default class AuditContextMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    return runWithAuditContext(ctx, () => next())
  }
}
