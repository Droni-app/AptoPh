import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { PLAN, SIGNUP_LEGAL_DOCUMENTS, TRIAL_DAYS } from '@aptoph/shared'
import Enrollment from '#models/tenants/enrollment'
import Subscription from '#models/billing/subscription'
import Tenant from '#models/tenants/tenant'
import User from '#models/auth/user'
import { recordAcceptances, type AcceptanceEvidence } from '#services/legal/legal_acceptances'

export type SignupInput = {
  fullName: string
  email: string
  phone: string
  password: string
  tenantName: string
  city: string
  units: number
}

export class EmailTakenError extends Error {}

/** "Conjunto Álamos del Río" → "conjunto-alamos-del-rio" */
export function slugify(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'conjunto'
  )
}

/**
 * Self-service sign-up: creates the administrator's account, the tenant (conjunto),
 * the administrator enrollment and a 30-day trial subscription, all or nothing,
 * with the evidence of the accepted legal documents (the data processing agreement
 * on behalf of the new conjunto).
 */
export default class SignupService {
  async register(input: SignupInput, evidence: AcceptanceEvidence) {
    return db.transaction(async (trx) => {
      const existing = await User.query({ client: trx }).where('email', input.email).first()
      if (existing) throw new EmailTakenError()

      const user = await User.create(
        {
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          password: input.password,
        },
        { client: trx }
      )

      const tenant = await Tenant.create(
        {
          name: input.tenantName,
          slug: await this.uniqueSlug(input.tenantName, trx),
          city: input.city,
          status: 'trial',
        },
        { client: trx }
      )

      await Enrollment.create(
        {
          tenantId: tenant.id,
          userId: user.id,
          role: 'administrator',
          status: 'active',
          acceptedAt: DateTime.now(),
        },
        { client: trx }
      )

      const subscription = await Subscription.create(
        {
          tenantId: tenant.id,
          plan: PLAN.id,
          billingCycle: 'monthly',
          status: 'trialing',
          declaredUnits: input.units,
          trialEndsAt: DateTime.now().plus({ days: TRIAL_DAYS }),
        },
        { client: trx }
      )

      await recordAcceptances(
        {
          userId: user.id,
          tenantId: tenant.id,
          documents: SIGNUP_LEGAL_DOCUMENTS,
          context: 'signup',
          evidence,
        },
        trx
      )

      return { user, tenant, subscription }
    })
  }

  private async uniqueSlug(name: string, trx: TransactionClientContract) {
    const base = slugify(name)
    const rows = await Tenant.query({ client: trx })
      .where((query) => query.where('slug', base).orWhere('slug', 'like', `${base}-%`))
      .select('slug')
    const taken = new Set(rows.map((tenant) => tenant.slug))
    if (!taken.has(base)) return base
    for (let suffix = 2; ; suffix++) {
      const slug = `${base}-${suffix}`
      if (!taken.has(slug)) return slug
    }
  }
}
