import db from '@adonisjs/lucid/services/db'
import { type AccountClass, addMonths, fromCents, toCents } from '@aptoph/shared'
import type Tenant from '#models/tenants/tenant'
import { parentCode } from '#services/finance/chart_template'
import { todayFor } from '#services/finance/support'

type AccountRow = {
  id: string
  code: string
  name: string
  class: AccountClass
  nature: 'debit' | 'credit'
  is_postable: boolean
  system_key: string | null
}

export type BalanceRow = {
  accountId: string
  code: string
  name: string
  class: AccountClass
  level: number
  isPostable: boolean
  /** Signed by the account's nature (trial balance) or class (financial statements) */
  opening: string
  debit: string
  credit: string
  closing: string
}

/** Assets and expenses grow with debits; liabilities, equity and income with credits */
const debitSide = (accountClass: AccountClass) =>
  accountClass === 'asset' || accountClass === 'expense'

function levelOf(code: string) {
  return code.length === 1
    ? 1
    : code.length === 2
      ? 2
      : code.length === 4
        ? 3
        : code.length === 6
          ? 4
          : 5
}

async function accountsOf(tenantId: string) {
  const result = await db.rawQuery(
    'SELECT id, code, name, class, nature, is_postable, system_key FROM ledger_accounts WHERE tenant_id = ? ORDER BY code',
    [tenantId]
  )
  return result.rows as AccountRow[]
}

/**
 * Movements per account between two dates (inclusive), with the balance before
 * `from`, rolled up to the parent accounts. In cents.
 */
async function movements(tenantId: string, from: string | null, to: string) {
  const result = await db.rawQuery(
    `SELECT l.account_id,
            COALESCE(SUM(CASE WHEN ?::date IS NOT NULL AND e.date < ?::date THEN l.debit - l.credit END), 0) AS opening,
            COALESCE(SUM(CASE WHEN ?::date IS NULL OR e.date >= ?::date THEN l.debit END), 0) AS debit,
            COALESCE(SUM(CASE WHEN ?::date IS NULL OR e.date >= ?::date THEN l.credit END), 0) AS credit
       FROM journal_lines l
       JOIN journal_entries e ON e.id = l.entry_id
      WHERE l.tenant_id = ? AND e.date <= ?::date
      GROUP BY l.account_id`,
    [from, from, from, from, from, from, tenantId, to]
  )
  const accounts = await accountsOf(tenantId)
  const byCode = new Map(accounts.map((account) => [account.code, account]))
  const totals = new Map<string, { opening: number; debit: number; credit: number }>()
  const codeOf = new Map(accounts.map((account) => [account.id, account.code]))

  for (const row of result.rows as Array<{
    account_id: string
    opening: string
    debit: string
    credit: string
  }>) {
    let code: string | null = codeOf.get(row.account_id) ?? null
    const values = {
      opening: toCents(row.opening),
      debit: toCents(row.debit),
      credit: toCents(row.credit),
    }
    while (code) {
      const total = totals.get(code) ?? { opening: 0, debit: 0, credit: 0 }
      total.opening += values.opening
      total.debit += values.debit
      total.credit += values.credit
      totals.set(code, total)
      code = parentCode(code)
      while (code && !byCode.has(code)) code = parentCode(code)
    }
  }
  return { accounts, totals }
}

function toRow(
  account: AccountRow,
  total: { opening: number; debit: number; credit: number },
  signBy: 'nature' | 'class' = 'nature'
): BalanceRow {
  const debitNature = signBy === 'nature' ? account.nature === 'debit' : debitSide(account.class)
  const sign = debitNature ? 1 : -1
  const closing = total.opening + total.debit - total.credit
  return {
    accountId: account.id,
    code: account.code,
    name: account.name,
    class: account.class,
    level: levelOf(account.code),
    isPostable: account.is_postable,
    opening: fromCents(sign * total.opening),
    debit: fromCents(total.debit),
    credit: fromCents(total.credit),
    closing: fromCents(sign * closing),
  }
}

export class FinanceReports {
  constructor(private tenant: Tenant) {}

  /** Balance de prueba */
  async trialBalance(from: string, to: string, maxLevel = 5) {
    const { accounts, totals } = await movements(this.tenant.id, from, to)
    const rows = accounts
      .filter((account) => totals.has(account.code) && levelOf(account.code) <= maxLevel)
      .map((account) => toRow(account, totals.get(account.code)!))
      .filter((row) => row.opening !== '0.00' || row.debit !== '0.00' || row.credit !== '0.00')
    const classes = accounts.filter((account) => account.code.length === 1)
    const debit = classes.reduce((sum, account) => sum + (totals.get(account.code)?.debit ?? 0), 0)
    const credit = classes.reduce(
      (sum, account) => sum + (totals.get(account.code)?.credit ?? 0),
      0
    )
    return { from, to, rows, totals: { debit: fromCents(debit), credit: fromCents(credit) } }
  }

  /** Estado de resultados (ingresos y gastos del rango) */
  async incomeStatement(from: string, to: string) {
    const { accounts, totals } = await movements(this.tenant.id, from, to)
    const section = (accountClass: AccountClass) => {
      const rows = accounts
        .filter(
          (account) =>
            account.class === accountClass && account.code.length > 1 && totals.has(account.code)
        )
        .map((account) => {
          const total = totals.get(account.code)!
          const value = debitSide(accountClass)
            ? total.debit - total.credit
            : total.credit - total.debit
          return {
            accountId: account.id,
            code: account.code,
            name: account.name,
            level: levelOf(account.code),
            amount: value,
          }
        })
        .filter((row) => row.amount !== 0)
      const root = accounts.find(
        (account) => account.code === (accountClass === 'income' ? '4' : '5')
      )
      const rootTotal = root ? totals.get(root.code) : undefined
      const total = rootTotal
        ? debitSide(accountClass)
          ? rootTotal.debit - rootTotal.credit
          : rootTotal.credit - rootTotal.debit
        : 0
      return { rows: rows.map((row) => ({ ...row, amount: fromCents(row.amount) })), total }
    }
    const income = section('income')
    const expense = section('expense')
    return {
      from,
      to,
      income: { rows: income.rows, total: fromCents(income.total) },
      expense: { rows: expense.rows, total: fromCents(expense.total) },
      result: fromCents(income.total - expense.total),
    }
  }

  /** Estado de situación financiera a una fecha */
  async balanceSheet(asOf: string, maxLevel = 4) {
    const { accounts, totals } = await movements(this.tenant.id, null, asOf)
    const section = (accountClass: AccountClass) => {
      const rows = accounts
        .filter(
          (account) =>
            account.class === accountClass &&
            account.code.length > 1 &&
            levelOf(account.code) <= maxLevel &&
            totals.has(account.code)
        )
        .map((account) => toRow(account, totals.get(account.code)!, 'class'))
        .filter((row) => row.closing !== '0.00')
        .map((row) => ({
          accountId: row.accountId,
          code: row.code,
          name: row.name,
          level: row.level,
          amount: row.closing,
        }))
      const root = totals.get(
        accountClass === 'asset' ? '1' : accountClass === 'liability' ? '2' : '3'
      )
      const value = root ? root.opening + root.debit - root.credit : 0
      return { rows, total: debitSide(accountClass) ? value : -value }
    }
    const assets = section('asset')
    const liabilities = section('liability')
    const equity = section('equity')
    const income = totals.get('4')
    const expense = totals.get('5')
    const result =
      (income ? income.credit - income.debit : 0) - (expense ? expense.debit - expense.credit : 0)
    return {
      asOf,
      assets: { rows: assets.rows, total: fromCents(assets.total) },
      liabilities: { rows: liabilities.rows, total: fromCents(liabilities.total) },
      equity: { rows: equity.rows, total: fromCents(equity.total) },
      /** Income − expenses not yet closed into equity */
      result: fromCents(result),
      totalLiabilitiesAndEquity: fromCents(liabilities.total + equity.total + result),
    }
  }

  /** Libro auxiliar de una cuenta (y sus subcuentas), opcionalmente por tercero */
  async ledger(input: {
    accountId: string
    from: string
    to: string
    unitId?: string
    vendorId?: string
  }) {
    const accounts = await accountsOf(this.tenant.id)
    const account = accounts.find((row) => row.id === input.accountId)
    if (!account) return null
    const filters: string[] = []
    const bindings: unknown[] = []
    if (input.unitId) {
      filters.push('AND l.unit_id = ?')
      bindings.push(input.unitId)
    }
    if (input.vendorId) {
      filters.push('AND l.vendor_id = ?')
      bindings.push(input.vendorId)
    }
    const base = `FROM journal_lines l
       JOIN journal_entries e ON e.id = l.entry_id
       JOIN ledger_accounts a ON a.id = l.account_id
      WHERE l.tenant_id = ? AND a.code LIKE ? ${filters.join(' ')}`
    const opening = await db.rawQuery(
      `SELECT COALESCE(SUM(l.debit - l.credit), 0) AS value ${base} AND e.date < ?::date`,
      [this.tenant.id, `${account.code}%`, ...bindings, input.from]
    )
    const lines = await db.rawQuery(
      `SELECT l.id, e.id AS entry_id, e.number, e.date, e.type, e.description AS entry_description,
              l.description, l.debit, l.credit, a.code AS account_code, a.name AS account_name,
              u.code AS unit_code, v.name AS vendor_name
         ${base.replace('WHERE', 'LEFT JOIN units u ON u.id = l.unit_id LEFT JOIN vendors v ON v.id = l.vendor_id WHERE')}
          AND e.date BETWEEN ?::date AND ?::date
        ORDER BY e.date, e.number, l.id
        LIMIT 5001`,
      [this.tenant.id, `${account.code}%`, ...bindings, input.from, input.to]
    )
    const sign = debitSide(account.class) ? 1 : -1
    let balance = toCents((opening.rows[0] as { value: string }).value)
    const openingBalance = balance
    let debit = 0
    let credit = 0
    const rows = (lines.rows as Array<Record<string, string>>).slice(0, 5000).map((line) => {
      balance += toCents(line.debit) - toCents(line.credit)
      debit += toCents(line.debit)
      credit += toCents(line.credit)
      return {
        id: line.id,
        entryId: line.entry_id,
        number: Number(line.number),
        date: isoDate(line.date),
        type: line.type,
        description: line.description ?? line.entry_description,
        entryDescription: line.entry_description,
        accountCode: line.account_code,
        accountName: line.account_name,
        thirdParty: line.unit_code ? `Unidad ${line.unit_code}` : (line.vendor_name ?? null),
        debit: fromCents(toCents(line.debit)),
        credit: fromCents(toCents(line.credit)),
        balance: fromCents(sign * balance),
      }
    })
    return {
      account: { id: account.id, code: account.code, name: account.name, class: account.class },
      from: input.from,
      to: input.to,
      opening: fromCents(sign * openingBalance),
      debit: fromCents(debit),
      credit: fromCents(credit),
      closing: fromCents(sign * balance),
      rows,
      truncated: lines.rows.length > 5000,
    }
  }

  /**
   * Estado de cuenta de una unidad: lo que se le cobró y lo que pagó, desde el
   * libro mayor (cuentas por cobrar y anticipos de la unidad).
   */
  async unitStatement(unitId: string, from?: string | null, to?: string | null) {
    const end = to ?? todayFor(this.tenant)
    const accountFilter = `(a.code LIKE '1305%' OR a.system_key = 'advances.units'
       OR a.id IN (SELECT receivable_account_id FROM charge_concepts WHERE tenant_id = l.tenant_id))`
    const opening = from
      ? await db.rawQuery(
          `SELECT COALESCE(SUM(l.debit - l.credit), 0) AS value
             FROM journal_lines l JOIN journal_entries e ON e.id = l.entry_id
             JOIN ledger_accounts a ON a.id = l.account_id
            WHERE l.tenant_id = ? AND l.unit_id = ? AND ${accountFilter} AND e.date < ?::date`,
          [this.tenant.id, unitId, from]
        )
      : null
    const result = await db.rawQuery(
      `SELECT e.id, e.number, e.date, e.type, e.description, e.source_type, e.source_id,
              SUM(l.debit - l.credit) AS net,
              array_agg(l.description ORDER BY l.debit DESC) FILTER (WHERE l.description IS NOT NULL) AS details
         FROM journal_lines l JOIN journal_entries e ON e.id = l.entry_id
         JOIN ledger_accounts a ON a.id = l.account_id
        WHERE l.tenant_id = ? AND l.unit_id = ? AND ${accountFilter}
          AND e.date <= ?::date ${from ? 'AND e.date >= ?::date' : ''}
        GROUP BY e.id
        HAVING SUM(l.debit - l.credit) <> 0
        ORDER BY e.date, e.number`,
      from ? [this.tenant.id, unitId, end, from] : [this.tenant.id, unitId, end]
    )
    let balance = opening ? toCents((opening.rows[0] as { value: string }).value) : 0
    const openingBalance = balance
    const rows = (result.rows as Array<Record<string, any>>).map((row) => {
      const net = toCents(row.net)
      balance += net
      return {
        entryId: row.id as string,
        number: Number(row.number),
        date: isoDate(row.date),
        type: row.type as string,
        description: row.description as string,
        details: ((row.details as string[] | null) ?? []).filter(
          (detail) => !/^Ref\. /.test(detail) && detail !== 'Saldo a favor'
        ),
        charge: net > 0 ? fromCents(net) : '0.00',
        payment: net < 0 ? fromCents(-net) : '0.00',
        balance: fromCents(balance),
      }
    })
    return {
      from: from ?? null,
      to: end,
      opening: fromCents(openingBalance),
      rows,
      closing: fromCents(balance),
    }
  }

  /** Cartera por edades, desde el saldo actual de los cargos */
  async receivablesAging(asOf = todayFor(this.tenant)) {
    const result = await db.rawQuery(
      `SELECT u.id AS unit_id, u.code, u.type, b.name AS building,
              COALESCE(SUM(c.balance) FILTER (WHERE c.due_on >= ?::date), 0) AS current,
              COALESCE(SUM(c.balance) FILTER (WHERE c.due_on < ?::date AND c.due_on >= ?::date - 30), 0) AS d30,
              COALESCE(SUM(c.balance) FILTER (WHERE c.due_on < ?::date - 30 AND c.due_on >= ?::date - 60), 0) AS d60,
              COALESCE(SUM(c.balance) FILTER (WHERE c.due_on < ?::date - 60 AND c.due_on >= ?::date - 90), 0) AS d90,
              COALESCE(SUM(c.balance) FILTER (WHERE c.due_on < ?::date - 90), 0) AS over90,
              COALESCE(SUM(c.balance), 0) AS total,
              MIN(c.due_on) FILTER (WHERE c.due_on < ?::date) AS oldest_due,
              (SELECT COALESCE(SUM(p.unapplied_amount), 0) FROM payments p
                WHERE p.unit_id = u.id AND p.status = 'confirmed') AS credit
         FROM units u
         LEFT JOIN buildings b ON b.id = u.building_id
         LEFT JOIN charges c ON c.unit_id = u.id AND c.status IN ('pending', 'partially_paid') AND c.balance > 0
        WHERE u.tenant_id = ? AND u.deleted_at IS NULL
        GROUP BY u.id, b.name
       HAVING COALESCE(SUM(c.balance), 0) > 0
           OR (SELECT COALESCE(SUM(p.unapplied_amount), 0) FROM payments p WHERE p.unit_id = u.id AND p.status = 'confirmed') > 0
        ORDER BY COALESCE(SUM(c.balance), 0) DESC, length(u.code), u.code`,
      [asOf, asOf, asOf, asOf, asOf, asOf, asOf, asOf, asOf, this.tenant.id]
    )
    const keys = ['current', 'd30', 'd60', 'd90', 'over90', 'total', 'credit'] as const
    const totals = Object.fromEntries(keys.map((key) => [key, 0])) as Record<
      (typeof keys)[number],
      number
    >
    const rows = (result.rows as Array<Record<string, any>>).map((row) => {
      for (const key of keys) totals[key] += toCents(row[key])
      return {
        unitId: row.unit_id as string,
        code: row.code as string,
        type: row.type as string,
        building: (row.building as string | null) ?? null,
        oldestDue: row.oldest_due ? isoDate(row.oldest_due) : null,
        ...Object.fromEntries(keys.map((key) => [key, fromCents(toCents(row[key]))])),
      } as Record<string, any>
    })
    return {
      asOf,
      rows,
      totals: Object.fromEntries(keys.map((key) => [key, fromCents(totals[key])])),
      unitsInArrears: rows.filter((row) => toCents(row.total) - toCents(row.current) > 0).length,
    }
  }

  /** Cuentas por pagar por edades */
  async payablesAging(asOf = todayFor(this.tenant)) {
    const result = await db.rawQuery(
      `SELECT v.id AS vendor_id, v.name, v.document_number,
              COALESCE(SUM(b.balance) FILTER (WHERE b.due_on >= ?::date), 0) AS current,
              COALESCE(SUM(b.balance) FILTER (WHERE b.due_on < ?::date AND b.due_on >= ?::date - 30), 0) AS d30,
              COALESCE(SUM(b.balance) FILTER (WHERE b.due_on < ?::date - 30 AND b.due_on >= ?::date - 60), 0) AS d60,
              COALESCE(SUM(b.balance) FILTER (WHERE b.due_on < ?::date - 60), 0) AS over60,
              COALESCE(SUM(b.balance), 0) AS total,
              COUNT(b.id) AS bills
         FROM vendors v
         JOIN bills b ON b.vendor_id = v.id AND b.status IN ('pending', 'partially_paid')
        WHERE v.tenant_id = ?
        GROUP BY v.id
        ORDER BY total DESC, v.name`,
      [asOf, asOf, asOf, asOf, asOf, asOf, this.tenant.id]
    )
    const keys = ['current', 'd30', 'd60', 'over60', 'total'] as const
    const totals = Object.fromEntries(keys.map((key) => [key, 0])) as Record<
      (typeof keys)[number],
      number
    >
    const rows = (result.rows as Array<Record<string, any>>).map((row) => {
      for (const key of keys) totals[key] += toCents(row[key])
      return {
        vendorId: row.vendor_id as string,
        name: row.name as string,
        documentNumber: (row.document_number as string | null) ?? null,
        bills: Number(row.bills),
        ...Object.fromEntries(keys.map((key) => [key, fromCents(toCents(row[key]))])),
      }
    })
    return {
      asOf,
      rows,
      totals: Object.fromEntries(keys.map((key) => [key, fromCents(totals[key])])),
    }
  }

  /** Saldos de bancos y cajas */
  async cashBalances(asOf = todayFor(this.tenant)) {
    const result = await db.rawQuery(
      `SELECT c.id, c.name, c.type, c.bank_name, c.account_kind, c.account_number, c.is_active,
              a.code AS account_code,
              COALESCE((SELECT SUM(l.debit - l.credit) FROM journal_lines l
                          JOIN journal_entries e ON e.id = l.entry_id
                         WHERE l.account_id = c.ledger_account_id AND e.date <= ?::date), 0) AS balance
         FROM cash_accounts c JOIN ledger_accounts a ON a.id = c.ledger_account_id
        WHERE c.tenant_id = ?
        ORDER BY c.is_active DESC, c.type, c.name`,
      [asOf, this.tenant.id]
    )
    return (result.rows as Array<Record<string, any>>).map((row) => ({
      id: row.id as string,
      balance: fromCents(toCents(row.balance)),
    }))
  }

  /** Ejecución presupuestal: presupuesto del año contra lo causado */
  async budgetExecution(budget: { id: string; year: number }, asOf = todayFor(this.tenant)) {
    const from = `${budget.year}-01-01`
    const to = asOf < `${budget.year}-12-31` ? asOf : `${budget.year}-12-31`
    const elapsed = to < from ? 0 : Number(to.slice(5, 7))
    const result = await db.rawQuery(
      `WITH actual AS (
         SELECT l.account_id, SUM(l.debit - l.credit) AS net
           FROM journal_lines l JOIN journal_entries e ON e.id = l.entry_id
          WHERE l.tenant_id = ? AND e.date BETWEEN ?::date AND ?::date
          GROUP BY l.account_id
       )
       SELECT a.id, a.code, a.name, a.class, i.id AS item_id, i.description,
              COALESCE(i.annual_amount, 0) AS budgeted, COALESCE(x.net, 0) AS net
         FROM ledger_accounts a
         LEFT JOIN budget_items i ON i.account_id = a.id AND i.budget_id = ?
         LEFT JOIN actual x ON x.account_id = a.id
        WHERE a.tenant_id = ? AND a.class IN ('income', 'expense')
          AND (i.id IS NOT NULL OR COALESCE(x.net, 0) <> 0)
        ORDER BY a.code`,
      [this.tenant.id, from, to, budget.id, this.tenant.id]
    )
    const sections = { income: [] as any[], expense: [] as any[] }
    const totals = {
      income: { budgeted: 0, toDate: 0, actual: 0 },
      expense: { budgeted: 0, toDate: 0, actual: 0 },
    }
    for (const row of result.rows as Array<Record<string, any>>) {
      const accountClass = row.class as 'income' | 'expense'
      const budgeted = toCents(row.budgeted)
      const toDate = Math.round((budgeted * elapsed) / 12)
      const actual = accountClass === 'expense' ? toCents(row.net) : -toCents(row.net)
      totals[accountClass].budgeted += budgeted
      totals[accountClass].toDate += toDate
      totals[accountClass].actual += actual
      sections[accountClass].push({
        accountId: row.id,
        code: row.code,
        name: row.name,
        itemId: row.item_id ?? null,
        description: row.description ?? null,
        budgeted: fromCents(budgeted),
        toDate: fromCents(toDate),
        actual: fromCents(actual),
        variance: fromCents(actual - toDate),
        execution: budgeted > 0 ? Math.round((actual / budgeted) * 1000) / 10 : null,
      })
    }
    const format = (total: { budgeted: number; toDate: number; actual: number }) => ({
      budgeted: fromCents(total.budgeted),
      toDate: fromCents(total.toDate),
      actual: fromCents(total.actual),
      variance: fromCents(total.actual - total.toDate),
      execution:
        total.budgeted > 0 ? Math.round((total.actual / total.budgeted) * 1000) / 10 : null,
    })
    return {
      asOf: to,
      monthsElapsed: elapsed,
      income: { rows: sections.income, totals: format(totals.income) },
      expense: { rows: sections.expense, totals: format(totals.expense) },
    }
  }

  /** Resumen para el tablero de finanzas */
  async summary() {
    const today = todayFor(this.tenant)
    const month = `${today.slice(0, 7)}-01`
    const nextMonth = addMonths(month, 1)
    const [billed, collected, expenses, pending, cash, aging, payables, trend] = await Promise.all([
      db.rawQuery(
        `SELECT COALESCE(SUM(amount), 0) AS value FROM charges
          WHERE tenant_id = ? AND period = ?::date AND status <> 'cancelled'`,
        [this.tenant.id, month]
      ),
      db.rawQuery(
        `SELECT COALESCE(SUM(amount), 0) AS value, COUNT(*) AS count FROM payments
          WHERE tenant_id = ? AND status = 'confirmed' AND paid_at >= ?::date AND paid_at < ?::date`,
        [this.tenant.id, month, nextMonth]
      ),
      db.rawQuery(
        `SELECT COALESCE(SUM(l.debit - l.credit), 0) AS value
           FROM journal_lines l JOIN journal_entries e ON e.id = l.entry_id
           JOIN ledger_accounts a ON a.id = l.account_id
          WHERE l.tenant_id = ? AND a.class = 'expense' AND e.date >= ?::date AND e.date < ?::date`,
        [this.tenant.id, month, nextMonth]
      ),
      db.rawQuery(
        `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS value FROM payments
          WHERE tenant_id = ? AND status = 'pending_review'`,
        [this.tenant.id]
      ),
      this.cashBalances(today),
      this.receivablesAging(today),
      db.rawQuery(
        `SELECT COALESCE(SUM(balance), 0) AS total,
                COALESCE(SUM(balance) FILTER (WHERE due_on < ?::date), 0) AS overdue,
                COUNT(*) FILTER (WHERE due_on <= ?::date + 7) AS due_soon
           FROM bills WHERE tenant_id = ? AND status IN ('pending', 'partially_paid')`,
        [today, today, this.tenant.id]
      ),
      db.rawQuery(
        `WITH months AS (
           SELECT generate_series(?::date - interval '5 months', ?::date, interval '1 month')::date AS month
         )
         SELECT m.month,
                (SELECT COALESCE(SUM(amount), 0) FROM charges c
                  WHERE c.tenant_id = ? AND c.period = m.month AND c.status <> 'cancelled') AS billed,
                (SELECT COALESCE(SUM(amount), 0) FROM payments p
                  WHERE p.tenant_id = ? AND p.status = 'confirmed'
                    AND p.paid_at >= m.month AND p.paid_at < m.month + interval '1 month') AS collected,
                (SELECT COALESCE(SUM(l.debit - l.credit), 0) FROM journal_lines l
                   JOIN journal_entries e ON e.id = l.entry_id JOIN ledger_accounts a ON a.id = l.account_id
                  WHERE l.tenant_id = ? AND a.class = 'expense'
                    AND e.date >= m.month AND e.date < m.month + interval '1 month') AS expenses
           FROM months m ORDER BY m.month`,
        [month, month, this.tenant.id, this.tenant.id, this.tenant.id]
      ),
    ])
    const cashTotal = cash.reduce((sum, row) => sum + toCents(row.balance), 0)
    const value = (result: { rows: Array<Record<string, any>> }, key = 'value') =>
      fromCents(toCents(result.rows[0]![key]))
    return {
      month,
      billed: value(billed),
      collected: value(collected),
      paymentsCount: Number(collected.rows[0].count),
      expenses: value(expenses),
      pendingReview: { count: Number(pending.rows[0].count), amount: value(pending) },
      cash: { total: fromCents(cashTotal), accounts: cash },
      receivables: {
        total: aging.totals.total,
        overdue: fromCents(toCents(aging.totals.total) - toCents(aging.totals.current)),
        credit: aging.totals.credit,
        unitsInArrears: aging.unitsInArrears,
      },
      payables: {
        total: value(payables, 'total'),
        overdue: value(payables, 'overdue'),
        dueSoon: Number(payables.rows[0].due_soon),
      },
      trend: (trend.rows as Array<Record<string, any>>).map((row) => ({
        month: isoDate(row.month),
        billed: fromCents(toCents(row.billed)),
        collected: fromCents(toCents(row.collected)),
        expenses: fromCents(toCents(row.expenses)),
      })),
    }
  }
}

/** pg returns DATE columns as Date at local midnight */
export function isoDate(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(value).slice(0, 10)
}
