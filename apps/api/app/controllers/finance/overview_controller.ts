import type { HttpContext } from '@adonisjs/core/http'
import { FinanceReports } from '#services/finance/reports'
import { settingsOf, todayFor } from '#services/finance/support'
import { financeSettingsValidator } from '#validators/finance/finance'

export default class OverviewController {
  /** GET /finance/summary */
  async summary({ tenant }: HttpContext) {
    return { data: await new FinanceReports(tenant).summary() }
  }

  /** GET /finance/settings */
  async settings({ tenant }: HttpContext) {
    return { data: { ...settingsOf(tenant), today: todayFor(tenant) } }
  }

  /** PUT /finance/settings */
  async updateSettings({ tenant, request }: HttpContext) {
    const data = await request.validateUsing(financeSettingsValidator)
    tenant.settings = { ...(tenant.settings ?? {}), finance: data }
    await tenant.save()
    return { data: { ...settingsOf(tenant), today: todayFor(tenant) } }
  }
}
