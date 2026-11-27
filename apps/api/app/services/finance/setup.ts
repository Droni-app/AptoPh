import type Tenant from '#models/tenants/tenant'
import ChargeConcept from '#models/finance/charge_concept'
import LedgerAccount from '#models/finance/ledger_account'
import {
  CHART_TEMPLATE,
  DEFAULT_CONCEPTS,
  accountClass,
  accountKeysFor,
  defaultNature,
  isLeafCode,
} from '#services/finance/chart_template'
import { type Trx, transaction } from '#services/finance/support'

/** Bump when the template or the default concepts change */
const SETUP_VERSION = 1

/**
 * Prepares the finance module of a conjunto: chart of accounts, default charge
 * concepts and the accounts of every concept. Idempotent and cheap once done
 * (a version mark in `tenants.settings`).
 */
export async function ensureFinanceSetup(tenant: Tenant, trx?: Trx) {
  const settings = (tenant.settings ?? {}) as Record<string, unknown>
  if (settings.financeSetupVersion === SETUP_VERSION) return
  if (trx) return runSetup(tenant, trx)
  return transaction((client) => runSetup(tenant, client))
}

async function runSetup(tenant: Tenant, trx: Trx) {
  await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtext(?))', [`finance-setup:${tenant.id}`])

  // Chart of accounts: create what is missing, mark system accounts by code
  const existing = await LedgerAccount.query({ client: trx }).where('tenant_id', tenant.id)
  const byCode = new Map(existing.map((account) => [account.code, account]))
  const keyed = new Set(existing.map((account) => account.systemKey).filter(Boolean))
  const missing = CHART_TEMPLATE.filter((entry) => !byCode.has(entry.code))
  if (missing.length) {
    await LedgerAccount.createMany(
      missing.map((entry) => ({
        tenantId: tenant.id,
        code: entry.code,
        name: entry.name,
        class: accountClass(entry.code),
        nature: entry.nature ?? defaultNature(entry.code),
        isPostable: isLeafCode(entry.code) && !entry.group,
        systemKey: entry.key && !keyed.has(entry.key) ? entry.key : null,
        isActive: true,
      })),
      { client: trx }
    )
  }
  for (const entry of CHART_TEMPLATE) {
    const account = byCode.get(entry.code)
    if (entry.key && account && !keyed.has(entry.key) && !account.systemKey) {
      account.systemKey = entry.key
      await account.useTransaction(trx).save()
    }
  }

  const accounts = await LedgerAccount.query({ client: trx })
    .where('tenant_id', tenant.id)
    .whereNotNull('system_key')
  const accountId = (key: string) => accounts.find((account) => account.systemKey === key)!.id

  // Default concepts: reuse one with the same code, or the same name
  const concepts = await ChargeConcept.query({ client: trx }).where('tenant_id', tenant.id)
  for (const preset of DEFAULT_CONCEPTS) {
    const match =
      concepts.find((concept) => concept.code === preset.code) ??
      concepts.find(
        (concept) => !concept.code && concept.name.toLowerCase() === preset.name.toLowerCase()
      ) ??
      (preset.type === 'interest'
        ? concepts.find((concept) => !concept.code && concept.type === 'interest')
        : undefined)
    if (match) {
      if (!match.code) {
        match.code = preset.code
        await match.useTransaction(trx).save()
      }
      continue
    }
    const created = await ChargeConcept.create(
      {
        tenantId: tenant.id,
        code: preset.code,
        name: preset.name,
        type: preset.type,
        accruesInterest: preset.accruesInterest,
        allowsEarlyDiscount: preset.allowsEarlyDiscount,
        isActive: true,
      },
      { client: trx }
    )
    concepts.push(created)
  }

  for (const concept of concepts) {
    if (concept.receivableAccountId && concept.incomeAccountId) continue
    const keys = accountKeysFor(concept.type)
    concept.receivableAccountId ??= accountId(keys.receivable)
    concept.incomeAccountId ??= accountId(keys.income)
    await concept.useTransaction(trx).save()
  }

  tenant.settings = { ...(tenant.settings ?? {}), financeSetupVersion: SETUP_VERSION }
  await tenant.useTransaction(trx).save()
}
