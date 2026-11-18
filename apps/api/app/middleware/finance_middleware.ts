import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { ensureFinanceSetup } from '#services/finance/setup'

/**
 * Prepares the chart of accounts and default concepts of the conjunto the
 * first time someone opens finance. Must run after `tenant`.
 */
export default class FinanceMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await ensureFinanceSetup(ctx.tenant)
    return next()
  }
}
