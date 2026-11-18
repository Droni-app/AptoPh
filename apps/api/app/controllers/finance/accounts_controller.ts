import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import FieldException from '#exceptions/field_exception'
import type ChargeConcept from '#models/charge_concept'
import JournalLine from '#models/journal_line'
import LedgerAccount from '#models/ledger_account'
import type Tenant from '#models/tenant'
import { accountKeysFor, parentCode } from '#services/finance/chart_template'
import { serializeAccount, serializeConcept } from '#transformers/finance'
import {
  conceptValidator,
  ledgerAccountValidator,
  listAccountsValidator,
  updateLedgerAccountValidator,
} from '#validators/finance'

/** Account auxiliaries the system creates itself */
const MANAGED_PREFIXES = ['1105', '1110', '1120']

async function postableAccount(tenant: Tenant, id: string, classes: string[], field: string) {
  const account = await tenant.related('ledgerAccounts').query().where('id', id).first()
  if (!account || !account.isPostable || !account.isActive || !classes.includes(account.class)) {
    throw new FieldException(field, 'La cuenta no existe o no es válida para este uso')
  }
  return account
}

/**
 * Chart of accounts (plan de cuentas) and charge concepts.
 */
export default class AccountsController {
  async index({ tenant, request }: HttpContext) {
    const filters = await request.validateUsing(listAccountsValidator, { data: request.qs() })
    const query = tenant.related('ledgerAccounts').query().orderBy('code')
    if (filters.class) query.where('class', filters.class)
    if (filters.postable !== undefined) query.where('is_postable', filters.postable)
    const accounts = await query
    return { data: accounts.map(serializeAccount) }
  }

  /** Adds a subaccount under an existing account */
  async store({ tenant, request, response }: HttpContext) {
    const { code, name } = await request.validateUsing(ledgerAccountValidator)
    if (MANAGED_PREFIXES.some((prefix) => code.startsWith(prefix))) {
      throw new FieldException('code', 'Las cuentas de bancos y caja se crean desde Bancos y caja')
    }
    if (code.length !== 6 && code.length % 2 !== 0) {
      throw new FieldException('code', 'Usa 6 dígitos para una subcuenta u 8 para un auxiliar')
    }
    const existing = await tenant.related('ledgerAccounts').query().where('code', code).first()
    if (existing) throw new FieldException('code', 'Ya existe una cuenta con ese código')
    const parent = await tenant
      .related('ledgerAccounts')
      .query()
      .where('code', parentCode(code)!)
      .first()
    if (!parent) {
      throw new FieldException('code', `Primero debe existir la cuenta ${parentCode(code)}`)
    }
    if (parent.isPostable) {
      if (parent.systemKey) {
        throw new FieldException(
          'code',
          `La cuenta ${parent.code} la usa el sistema y no admite auxiliares`
        )
      }
      const used = await JournalLine.query().where('account_id', parent.id).first()
      if (used) {
        throw new FieldException(
          'code',
          `La cuenta ${parent.code} ya tiene movimientos y no admite auxiliares`
        )
      }
      parent.isPostable = false
      await parent.save()
    }
    const account = await tenant.related('ledgerAccounts').create({
      code,
      name,
      class: parent.class,
      nature: parent.nature,
      isPostable: true,
      isActive: true,
    })
    response.status(201)
    return { data: serializeAccount(account) }
  }

  async update({ tenant, params, request }: HttpContext) {
    const account = await tenant
      .related('ledgerAccounts')
      .query()
      .where('id', params.id)
      .firstOrFail()
    const data = await request.validateUsing(updateLedgerAccountValidator)
    if (data.isActive === false && account.systemKey) {
      throw new Exception('El sistema usa esta cuenta: no se puede desactivar', { status: 409 })
    }
    account.merge(data)
    await account.save()
    return { data: serializeAccount(account) }
  }

  async concepts({ tenant }: HttpContext) {
    const concepts = await tenant
      .related('chargeConcepts')
      .query()
      .preload('receivableAccount')
      .preload('incomeAccount')
      .orderByRaw('code IS NULL, name')
    return { data: concepts.map(serializeConcept) }
  }

  async storeConcept({ tenant, request, response }: HttpContext) {
    const data = await request.validateUsing(conceptValidator)
    if (data.type === 'interest') {
      throw new FieldException('type', 'Los intereses de mora usan el concepto del sistema')
    }
    const accounts = await this.conceptAccounts(tenant, data)
    const concept = await tenant.related('chargeConcepts').create({
      name: data.name,
      type: data.type,
      defaultAmount:
        data.defaultAmount === undefined || data.defaultAmount === null
          ? null
          : String(data.defaultAmount),
      accruesInterest: data.accruesInterest,
      allowsEarlyDiscount: data.allowsEarlyDiscount,
      isActive: data.isActive ?? true,
      ...accounts,
    })
    await concept.load('receivableAccount')
    await concept.load('incomeAccount')
    response.status(201)
    return { data: serializeConcept(concept) }
  }

  async updateConcept({ tenant, params, request }: HttpContext) {
    const concept = await tenant
      .related('chargeConcepts')
      .query()
      .where('id', params.id)
      .firstOrFail()
    const data = await request.validateUsing(conceptValidator)
    if (concept.code && data.type !== concept.type) {
      throw new FieldException('type', 'No se puede cambiar el tipo de un concepto del sistema')
    }
    if (!concept.code && data.type === 'interest') {
      throw new FieldException('type', 'Los intereses de mora usan el concepto del sistema')
    }
    concept.merge({
      name: data.name,
      type: data.type,
      defaultAmount:
        data.defaultAmount === undefined || data.defaultAmount === null
          ? null
          : String(data.defaultAmount),
      accruesInterest: concept.type === 'interest' ? false : data.accruesInterest,
      allowsEarlyDiscount: data.allowsEarlyDiscount,
      isActive: data.isActive ?? concept.isActive,
      ...(await this.conceptAccounts(tenant, data)),
    })
    await concept.save()
    await concept.load('receivableAccount')
    await concept.load('incomeAccount')
    return { data: serializeConcept(concept) }
  }

  private async conceptAccounts(
    tenant: Tenant,
    data: { type: ChargeConcept['type']; receivableAccountId?: string; incomeAccountId?: string }
  ) {
    const keys = accountKeysFor(data.type)
    const byKey = async (key: string) => {
      const account = await LedgerAccount.query()
        .where('tenant_id', tenant.id)
        .where('system_key', key)
        .firstOrFail()
      return account.id
    }
    const receivable = data.receivableAccountId
      ? await postableAccount(tenant, data.receivableAccountId, ['asset'], 'receivableAccountId')
      : null
    const income = data.incomeAccountId
      ? await postableAccount(tenant, data.incomeAccountId, ['income', 'equity'], 'incomeAccountId')
      : null
    return {
      receivableAccountId: receivable?.id ?? (await byKey(keys.receivable)),
      incomeAccountId: income?.id ?? (await byKey(keys.income)),
    }
  }
}
