import { Exception } from '@adonisjs/core/exceptions'
import type { BankAccountKind, CashAccountType } from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import CashAccount from '#models/finance/cash_account'
import LedgerAccount from '#models/finance/ledger_account'
import type { FinanceScope } from '#services/finance/scope'

/** Parent subaccount of the auxiliaries of each kind of account */
function parentCodeFor(type: CashAccountType, kind: BankAccountKind | null) {
  if (type === 'cash') return '110505'
  return kind === 'checking' ? '111005' : '112005'
}

/**
 * Bank accounts and cash boxes, each with its own ledger auxiliary.
 * docs/finance.md §7.
 */
export class CashService {
  constructor(private scope: FinanceScope) {}

  async create(input: {
    name: string
    type: CashAccountType
    bankName?: string | null
    accountKind?: BankAccountKind | null
    accountNumber?: string | null
    openingBalance?: number
    openingDate?: string
  }) {
    const { trx, tenant, ledger, accounts, userId } = this.scope
    const kind = input.type === 'bank' ? (input.accountKind ?? 'savings') : null
    const parent = parentCodeFor(input.type, kind)
    const siblings = await LedgerAccount.query({ client: trx })
      .where('tenant_id', tenant.id)
      .whereLike('code', `${parent}__`)
      .orderBy('code', 'desc')
    const next = siblings.length ? Number(siblings[0]!.code.slice(-2)) + 1 : 1
    if (next > 99) throw new Exception('No hay más subcuentas disponibles', { status: 409 })

    const ledgerAccount = await LedgerAccount.create(
      {
        tenantId: tenant.id,
        code: `${parent}${String(next).padStart(2, '0')}`,
        name: input.name,
        class: 'asset',
        nature: 'debit',
        isPostable: true,
        isActive: true,
      },
      { client: trx }
    )
    const account = await CashAccount.create(
      {
        tenantId: tenant.id,
        name: input.name,
        type: input.type,
        bankName: input.bankName ?? null,
        accountKind: kind,
        accountNumber: input.accountNumber ?? null,
        ledgerAccountId: ledgerAccount.id,
        isActive: true,
      },
      { client: trx }
    )

    accounts.register(ledgerAccount)
    if (input.openingBalance && input.openingBalance > 0) {
      await ledger.post({
        date: input.openingDate ?? this.scope.today,
        type: 'opening',
        description: `Saldo inicial · ${input.name}`,
        sourceType: 'cash_account',
        sourceId: account.id,
        userId,
        lines: [
          { accountId: ledgerAccount.id, debit: input.openingBalance },
          { accountId: accounts.key('equity.opening').id, credit: input.openingBalance },
        ],
      })
    }
    return account
  }

  async rename(account: CashAccount, name: string) {
    const ledgerAccount = await LedgerAccount.findOrFail(account.ledgerAccountId, {
      client: this.scope.trx,
    })
    ledgerAccount.name = name
    await ledgerAccount.useTransaction(this.scope.trx).save()
  }

  async transfer(input: {
    fromId: string
    toId: string
    amount: number
    date: string
    description?: string | null
  }) {
    const { trx, tenant, ledger, userId } = this.scope
    if (input.fromId === input.toId) throw new FieldException('toId', 'Elige dos cuentas distintas')
    const find = (id: string) =>
      CashAccount.query({ client: trx }).where('tenant_id', tenant.id).where('id', id).first()
    const from = await find(input.fromId)
    const to = await find(input.toId)
    if (!from) throw new FieldException('fromId', 'La cuenta de origen no existe')
    if (!to) throw new FieldException('toId', 'La cuenta de destino no existe')
    return ledger.post({
      date: input.date,
      type: 'transfer',
      description: input.description || `Traslado de ${from.name} a ${to.name}`,
      sourceType: 'transfer',
      userId,
      lines: [
        { accountId: to.ledgerAccountId, debit: input.amount },
        { accountId: from.ledgerAccountId, credit: input.amount },
      ],
    })
  }
}
