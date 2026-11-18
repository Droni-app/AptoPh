import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import { toCents } from '@aptoph/shared'
import { CashService } from '#services/finance/cash'
import { FinanceReports } from '#services/finance/reports'
import { serializeCashAccount } from '#transformers/finance'
import {
  cashAccountValidator,
  transferValidator,
  updateCashAccountValidator,
} from '#validators/finance'
import { finance } from '#controllers/finance/helpers'

/** Bank accounts and cash boxes (Bancos y caja) */
export default class CashAccountsController {
  async index({ tenant }: HttpContext) {
    const [accounts, balances] = await Promise.all([
      tenant
        .related('cashAccounts')
        .query()
        .preload('ledgerAccount')
        .orderBy('is_active', 'desc')
        .orderBy('name'),
      new FinanceReports(tenant).cashBalances(),
    ])
    const balanceOf = new Map(balances.map((row) => [row.id, row.balance]))
    return {
      data: accounts.map((account) => serializeCashAccount(account, balanceOf.get(account.id))),
    }
  }

  async store(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(cashAccountValidator)
    const account = await finance(ctx, (scope) =>
      new CashService(scope).create({
        ...data,
        openingBalance: data.openingBalance ? toCents(data.openingBalance) : 0,
      })
    )
    await account.load('ledgerAccount')
    ctx.response.status(201)
    return { data: serializeCashAccount(account) }
  }

  async update(ctx: HttpContext) {
    const { tenant, params, request } = ctx
    const account = await tenant
      .related('cashAccounts')
      .query()
      .where('id', params.id)
      .firstOrFail()
    const data = await request.validateUsing(updateCashAccountValidator)
    if (data.isActive === false) {
      const balances = await new FinanceReports(tenant).cashBalances()
      const balance = balances.find((row) => row.id === account.id)
      if (balance && toCents(balance.balance) !== 0) {
        throw new Exception('La cuenta tiene saldo: trasládalo antes de desactivarla', {
          status: 409,
        })
      }
    }
    await finance(ctx, async (scope) => {
      account.useTransaction(scope.trx)
      account.merge(data)
      await account.save()
      if (data.name) await new CashService(scope).rename(account, data.name)
    })
    await account.load('ledgerAccount')
    return { data: serializeCashAccount(account) }
  }

  async transfer(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(transferValidator)
    const entry = await finance(ctx, (scope) =>
      new CashService(scope).transfer({ ...data, amount: toCents(data.amount) })
    )
    ctx.response.status(201)
    return { data: { entryId: entry!.id, number: entry!.number } }
  }
}
