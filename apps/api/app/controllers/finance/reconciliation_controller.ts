import type { HttpContext } from '@adonisjs/core/http'
import { readFile } from 'node:fs/promises'
import type { BankColumnMapping } from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import type Payment from '#models/finance/payment'
import {
  BankStatementService,
  type ReconcileAction,
  reconcileLine,
  undoLine,
} from '#services/finance/bank_statements'
import { withFinance } from '#services/finance/scope'
import { notifyPaymentReviewed } from '#services/notifications/finance_notifications'
import { serializeLine, serializeStatement } from '#transformers/finance/reconciliation'
import {
  columnMappingValidator,
  listStatementsValidator,
  reconcileValidator,
  statementImportValidator,
  statementPreviewValidator,
} from '#validators/finance/reconciliation'
import { finance } from '#controllers/finance/helpers'

async function fileBytes(file: { tmpPath?: string }) {
  if (!file.tmpPath) throw new FieldException('file', 'No recibimos el archivo')
  return readFile(file.tmpPath)
}

async function readMapping(value: string): Promise<BankColumnMapping> {
  let json: unknown
  try {
    json = JSON.parse(value)
  } catch {
    throw new FieldException('mapping', 'La configuración de columnas no es válida')
  }
  return columnMappingValidator.validate(json)
}

type Notify = { payment: Payment; outcome: 'confirmed' | 'registered' } | null

/**
 * Bank reconciliation (back-office): import statements and reconcile their
 * movements. docs/finance.md §7.
 */
export default class ReconciliationController {
  /** GET /finance/bank-statements */
  async index({ tenant, request }: HttpContext) {
    const { cashAccountId } = await request.validateUsing(listStatementsValidator, {
      data: request.qs(),
    })
    const rows = await new BankStatementService(tenant).list(cashAccountId)
    return { data: rows.map(({ statement, counts }) => serializeStatement(statement, counts)) }
  }

  /** GET /finance/bank-statements/:id — with its movements and suggestions */
  async show({ tenant, params }: HttpContext) {
    return { data: await this.detail(tenant, params.id) }
  }

  private async detail(tenant: HttpContext['tenant'], id: string) {
    const service = new BankStatementService(tenant)
    const statement = await service.find(id)
    const lines = await service.lines(statement)
    const [suggestions, counts] = await Promise.all([
      service.suggestions(statement, lines),
      service.counts([statement.id]),
    ])
    return {
      ...serializeStatement(statement, counts.get(statement.id)),
      lines: lines.map((line) => serializeLine(line, suggestions.get(line.id) ?? null)),
    }
  }

  /** POST /finance/bank-statements/preview — reads the file; writes nothing */
  async preview({ tenant, request }: HttpContext) {
    const { file, mapping } = await request.validateUsing(statementPreviewValidator)
    const bytes = await fileBytes(file)
    const columns = mapping ? await readMapping(mapping) : undefined
    return { data: await new BankStatementService(tenant).preview(bytes, columns) }
  }

  /** POST /finance/bank-statements */
  async store({ tenant, auth, request, response }: HttpContext) {
    const data = await request.validateUsing(statementImportValidator)
    const statement = await new BankStatementService(tenant).import({
      cashAccountId: data.cashAccountId,
      fileName: data.file.clientName,
      bytes: await fileBytes(data.file),
      mapping: await readMapping(data.mapping),
      userId: auth.getUserOrFail().id,
    })
    response.status(201)
    return { data: await this.detail(tenant, statement.id) }
  }

  /** DELETE /finance/bank-statements/:id */
  async destroy({ tenant, params, response }: HttpContext) {
    const service = new BankStatementService(tenant)
    await service.destroy(await service.find(params.id))
    return response.noContent()
  }

  /** POST /finance/bank-statement-lines/:id/reconcile */
  async reconcile(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(reconcileValidator)
    const { line, notify } = await finance(ctx, (scope) =>
      reconcileLine(scope, ctx.params.id, input as ReconcileAction)
    )
    await this.notify(ctx.tenant, notify)
    return { data: await this.lineDetail(ctx.tenant, line.bankStatementId, line.id) }
  }

  /** POST /finance/bank-statement-lines/:id/undo */
  async undo(ctx: HttpContext) {
    const line = await finance(ctx, (scope) => undoLine(scope, ctx.params.id))
    return { data: await this.lineDetail(ctx.tenant, line.bankStatementId, line.id) }
  }

  /**
   * POST /finance/bank-statements/:id/apply-suggestions — applies every
   * high-confidence suggestion, each in its own transaction (one that fails
   * does not stop the rest).
   */
  async applySuggestions({ tenant, auth, params }: HttpContext) {
    const service = new BankStatementService(tenant)
    const statement = await service.find(params.id)
    const suggestions = await service.suggestions(statement, await service.lines(statement))
    const userId = auth.getUserOrFail().id
    let applied = 0
    const failed: Array<{ lineId: string; message: string }> = []
    for (const [lineId, suggestion] of suggestions) {
      if (suggestion.confidence !== 'high') continue
      const input: ReconcileAction =
        suggestion.action === 'register'
          ? { action: 'register', unitId: suggestion.unit.id }
          : suggestion.action === 'link_vendor_payment'
            ? { action: 'link_vendor_payment', vendorPaymentId: suggestion.vendorPayment.id }
            : { action: suggestion.action, paymentId: suggestion.payment.id }
      try {
        const { notify } = await withFinance(tenant, userId, (scope) =>
          reconcileLine(scope, lineId, input)
        )
        await this.notify(tenant, notify)
        applied++
      } catch (error) {
        failed.push({ lineId, message: (error as Error).message })
      }
    }
    return { data: { applied, failed, statement: await this.detail(tenant, statement.id) } }
  }

  private async notify(tenant: HttpContext['tenant'], notify: Notify) {
    if (notify) await notifyPaymentReviewed(tenant, notify.payment, notify.outcome)
  }

  private async lineDetail(tenant: HttpContext['tenant'], statementId: string, lineId: string) {
    const detail = await this.detail(tenant, statementId)
    return { line: detail.lines.find((line) => line.id === lineId)!, statement: detail }
  }
}
