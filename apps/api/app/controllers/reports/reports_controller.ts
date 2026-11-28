import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import { DateTime } from 'luxon'
import {
  canReadReport,
  REPORT_EXPORT_FORMATS,
  reportByKey,
  type ReportExportFormat,
} from '@aptoph/shared'
import { recordAudit } from '#services/audit/audit_log'
import { reportOptions, runReport } from '#services/reports/engine'
import { reportToCsv, reportToXlsx } from '#services/reports/export'
import { REPORT_RUNNERS } from '#services/reports/registry'

/**
 * Reports of the back-office (docs/reports.md): the lists of the filters, a
 * report as JSON and the same report as Excel or CSV.
 */
export default class ReportsController {
  /** The report of the URL, if the person's roles can read it */
  private definition({ params, tenantRoles }: HttpContext) {
    const definition = reportByKey(params.key)
    const runner = definition && REPORT_RUNNERS[definition.key]
    if (!definition || !runner) throw new Exception('El reporte no existe', { status: 404 })
    if (!canReadReport(definition, tenantRoles)) {
      throw new Exception('Tu rol no puede consultar este reporte', { status: 403 })
    }
    return { definition, runner }
  }

  async options({ tenant }: HttpContext) {
    return { data: await reportOptions(tenant) }
  }

  async show(ctx: HttpContext) {
    const { definition, runner } = this.definition(ctx)
    return { data: await runReport(definition, runner, ctx.tenant, ctx.request.qs()) }
  }

  async export(ctx: HttpContext) {
    const { definition, runner } = this.definition(ctx)
    const qs = ctx.request.qs()
    const format = (qs.format ?? 'xlsx') as ReportExportFormat
    if (!REPORT_EXPORT_FORMATS.includes(format)) {
      throw new Exception('Formato no válido', { status: 422 })
    }
    const result = await runReport(definition, runner, ctx.tenant, qs)
    const file =
      format === 'csv' ? reportToCsv(result, ctx.tenant) : await reportToXlsx(result, ctx.tenant)
    // Who took data out of the system, and with which filters (Ley 1581 de 2012)
    await recordAudit({
      tenantId: ctx.tenant.id,
      action: 'exported',
      type: 'reports',
      label: result.title,
      changes: {
        details: {
          report: definition.key,
          format,
          rows: result.rows.length,
          filters: Object.fromEntries(result.filters.map((filter) => [filter.label, filter.value])),
          personalData: definition.personalData === true,
        },
      },
    })
    const date = DateTime.now()
      .setZone(ctx.tenant.timezone || 'America/Bogota')
      .toISODate()
    const name = `${definition.key.replace(/_/g, '-')}-${date}.${format}`
    ctx.response.header(
      'Content-Type',
      format === 'csv'
        ? 'text/csv; charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    ctx.response.header('Content-Disposition', `attachment; filename="${name}"`)
    ctx.response.header('Access-Control-Expose-Headers', 'Content-Disposition')
    return ctx.response.send(file)
  }
}
