import type { TransactionClientContract, QueryClientContract } from '@adonisjs/lucid/types/database'
import type { LucidModel, LucidRow } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'
import type { AuditAction, AuditableType, AuditChanges } from '@aptoph/shared'
import AuditLog from '#models/tenants/audit_log'
import { auditMuted, currentActor } from '#services/audit/context'

/** Never stored, whatever the model */
const HIDDEN = new Set(['password', 'tokenHash', 'invitationTokenHash', 'hash'])
/** Bookkeeping columns: never an entry of their own and never shown */
const SKIPPED = new Set(['id', 'tenantId', 'createdAt', 'updatedAt'])
/** Long texts (comunicados, descripciones) are cut */
const MAX_TEXT = 500

export type AuditClient = QueryClientContract | TransactionClientContract

export type AuditableOptions<Row extends LucidRow = any> = {
  type: AuditableType
  /** How the record reads in the log ("Recibo 123"); may query with `client` */
  label?: (row: Row, client: AuditClient) => string | null | Promise<string | null>
  /** Record creations (default: yes) */
  create?: boolean | ((row: Row) => boolean)
  /** Record updates (default: yes); `before` has the previous values of what changed */
  update?: boolean | ((row: Row, before: Record<string, unknown>) => boolean)
  /** Record deletions (default: yes) */
  delete?: boolean
  /** Changes to only these fields make no entry (shown when something else changed too) */
  quiet?: string[]
  /** Only changes to these fields make an entry */
  only?: string[]
  /** Fields never stored for this model */
  hidden?: string[]
  /** Tenant of the record (default: `tenantId`) */
  tenantOf?: (row: Row) => string | null
}

type Diff = { before: Record<string, unknown>; after: Record<string, unknown> }

const pending = new WeakMap<LucidRow, Diff>()
/**
 * Rows created during this process with their entry: a row that is created and
 * then completed in the same request (number, status) keeps a single entry.
 */
const createdEntries = new WeakMap<LucidRow, AuditLog>()

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A value as it is stored in the log */
function serialize(model: LucidModel, key: string, value: unknown): unknown {
  if (value === undefined) return null
  if (DateTime.isDateTime(value)) {
    return model.$getColumn(key)?.meta?.type === 'date' ? value.toISODate() : value.toISO()
  }
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string' && value.length > MAX_TEXT) return `${value.slice(0, MAX_TEXT)}…`
  return value
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function visible(key: string, options: AuditableOptions) {
  return !SKIPPED.has(key) && !HIDDEN.has(key) && !options.hidden?.includes(key)
}

function snapshot(row: LucidRow, options: AuditableOptions) {
  const model = row.constructor as LucidModel
  const values: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row.$attributes)) {
    if (!visible(key, options) || value === null || value === undefined) continue
    values[key] = serialize(model, key, value)
  }
  return values
}

/** What changed in an update: previous and new values (objects only by their changed keys) */
function diffOf(row: LucidRow, options: AuditableOptions): Diff {
  const model = row.constructor as LucidModel
  const before: Record<string, unknown> = {}
  const after: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row.$dirty)) {
    if (!visible(key, options)) continue
    let previous = serialize(model, key, row.$original[key])
    let next = serialize(model, key, value)
    if (same(previous, next)) continue
    if (isPlainObject(previous) && isPlainObject(next)) {
      const prev = previous
      const nxt = next
      const keys = [...new Set([...Object.keys(prev), ...Object.keys(nxt)])].filter(
        (inner) => !same(prev[inner], nxt[inner])
      )
      if (keys.length === 0) continue
      previous = Object.fromEntries(keys.map((inner) => [inner, prev[inner] ?? null]))
      next = Object.fromEntries(keys.map((inner) => [inner, nxt[inner] ?? null]))
    }
    before[key] = previous
    after[key] = next
  }
  return { before, after }
}

/** The connection of a row (its transaction, so the entry rolls back with the change) */
function clientOf(row: LucidRow): AuditClient {
  const model = row.constructor as LucidModel
  return row.$trx ?? model.$adapter.modelConstructorClient(model, row.$options)
}

async function labelOf(row: LucidRow, options: AuditableOptions, client: AuditClient) {
  if (!options.label) return null
  try {
    const label = await options.label(row, client)
    return label ? label.slice(0, 200) : null
  } catch {
    return null
  }
}

/**
 * Writes one entry. The model hooks call it; modules call it directly for
 * actions that are not a change of a row (a report exported, a bulk update).
 */
export async function recordAudit(entry: {
  tenantId: string | null
  action: AuditAction
  type: AuditableType
  id?: string | null
  label?: string | null
  changes?: Omit<AuditChanges, 'label'>
  client?: AuditClient
  /** Defaults to the user of the current request */
  userId?: string | null
}) {
  if (auditMuted()) return
  const actor = currentActor()
  const changes: AuditChanges = { ...entry.changes }
  if (entry.label) changes.label = entry.label
  return AuditLog.create(
    {
      tenantId: entry.tenantId,
      userId: entry.userId === undefined ? actor.userId : entry.userId,
      action: entry.action,
      auditableType: entry.type,
      auditableId: entry.id ?? null,
      changes: Object.keys(changes).length ? changes : null,
      ipAddress: actor.ip,
    },
    entry.client ? { client: entry.client } : undefined
  )
}

/**
 * Records the creations, changes and deletions of a model in `audit_logs`
 * (docs/audit.md). Registered once per model in `start/audit.ts`.
 */
export function auditable<Model extends LucidModel>(
  model: Model,
  options: AuditableOptions<InstanceType<Model>>
) {
  model.boot()
  const opts = options as AuditableOptions
  const tenantOf = (row: LucidRow) =>
    opts.tenantOf ? opts.tenantOf(row) : ((row as any).tenantId as string | null)

  const write = async (row: LucidRow, action: AuditAction, changes: AuditChanges) => {
    const client = clientOf(row)
    return recordAudit({
      tenantId: tenantOf(row),
      action,
      type: opts.type,
      id: (row as any).id ?? null,
      label: await labelOf(row, opts, client),
      changes,
      client,
    })
  }

  if (opts.create !== false) {
    model.after('create', async (row: LucidRow) => {
      if (auditMuted()) return
      if (typeof opts.create === 'function' && !opts.create(row)) return
      const log = await write(row, 'created', { after: snapshot(row, opts) })
      if (log) createdEntries.set(row, log)
    })
  }

  if (opts.update !== false) {
    model.before('update', (row: LucidRow) => {
      if (auditMuted()) return
      const diff = diffOf(row, opts)
      const keys = Object.keys(diff.after)
      const relevant = keys.filter(
        (key) => !opts.quiet?.includes(key) && (!opts.only || opts.only.includes(key))
      )
      if (relevant.length === 0) return
      if (typeof opts.update === 'function' && !opts.update(row, diff.before)) return
      pending.set(row, diff)
    })
    model.after('update', async (row: LucidRow) => {
      const diff = pending.get(row)
      if (!diff) return
      pending.delete(row)
      const created = createdEntries.get(row)
      if (created && !('deletedAt' in diff.after)) {
        // Completed right after being created: the creation shows the final values
        const changes = { ...(created.changes as AuditChanges), after: snapshot(row, opts) }
        const label = await labelOf(row, opts, clientOf(row))
        if (label) changes.label = label
        created.changes = changes
        await created.useTransaction(clientOf(row) as any).save()
        return
      }
      const action: AuditAction =
        'deletedAt' in diff.after
          ? diff.after.deletedAt === null
            ? 'restored'
            : 'deleted'
          : 'updated'
      await write(row, action, diff)
    })
  }

  if (opts.delete !== false) {
    model.after('delete', async (row: LucidRow) => {
      if (auditMuted()) return
      await write(row, 'deleted', { before: snapshot(row, opts) })
    })
  }
}
