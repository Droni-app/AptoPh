import type { HttpContext } from '@adonisjs/core/http'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { LEGAL_DOCUMENTS, type LegalDocumentId } from '@aptoph/shared'
import LegalAcceptance, { type LegalAcceptanceContext } from '#models/legal/legal_acceptance'

/** Where an acceptance came from: kept as evidence next to it */
export type AcceptanceEvidence = {
  ipAddress: string | null
  userAgent: string | null
}

export function evidenceFrom(ctx: HttpContext): AcceptanceEvidence {
  return {
    ipAddress: ctx.request.ip() || null,
    userAgent: ctx.request.header('user-agent')?.slice(0, 500) ?? null,
  }
}

/**
 * Records that a person accepted the current version of each document
 * (packages/shared/src/legal.ts), for a conjunto and in a flow.
 */
export async function recordAcceptances(
  input: {
    userId: string
    tenantId: string | null
    documents: LegalDocumentId[]
    context: LegalAcceptanceContext
    evidence: AcceptanceEvidence
  },
  trx?: TransactionClientContract
) {
  const acceptedAt = DateTime.now()
  return LegalAcceptance.createMany(
    input.documents.map((document) => ({
      userId: input.userId,
      tenantId: input.tenantId,
      document,
      version: LEGAL_DOCUMENTS[document].version,
      context: input.context,
      ipAddress: input.evidence.ipAddress,
      userAgent: input.evidence.userAgent,
      acceptedAt,
    })),
    { client: trx }
  )
}
