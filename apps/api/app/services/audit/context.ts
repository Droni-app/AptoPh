import { AsyncLocalStorage } from 'node:async_hooks'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Who is changing things right now: the request that is running, so the model
 * hooks of the audit log know the user and the IP without passing them around.
 * Outside a request (scheduler, seeders) there is no actor: it reads as "Sistema".
 */
type AuditStore = { ctx?: HttpContext; muted?: boolean }

const storage = new AsyncLocalStorage<AuditStore>()

/** Runs a request with its audit context (router middleware) */
export function runWithAuditContext<T>(ctx: HttpContext, callback: () => T) {
  return storage.run({ ctx }, callback)
}

/**
 * Runs bulk work whose rows are not worth one audit entry each (the chart of
 * accounts created the first time someone opens finance, the demo seeder).
 * The caller records one summary entry when it matters.
 */
export function withoutAudit<T>(callback: () => T) {
  return storage.run({ ...storage.getStore(), muted: true }, callback)
}

export function auditMuted() {
  return storage.getStore()?.muted === true
}

export function currentActor() {
  const ctx = storage.getStore()?.ctx
  if (!ctx) return { userId: null, ip: null }
  return {
    userId: (ctx.auth?.user?.id as string | undefined) ?? null,
    ip: ctx.request.ip() ?? null,
  }
}
