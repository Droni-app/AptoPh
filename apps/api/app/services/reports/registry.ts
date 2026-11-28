import { REPORTS } from '@aptoph/shared'
import type { ReportRunner } from '#services/reports/engine'
import * as finance from '#services/reports/finance'
import * as operations from '#services/reports/operations'
import * as census from '#services/reports/census'

/** Every report of the catalog (`REPORTS` in @aptoph/shared) and the code that builds it */
export const REPORT_RUNNERS: Record<string, ReportRunner> = {
  collections: finance.collections,
  billing_collection: finance.billingCollection,
  receivables_aging: finance.receivablesAging,
  delinquents: finance.delinquents,
  charges_by_concept: finance.chargesByConcept,
  credit_balances: finance.creditBalances,
  cash_flow: finance.cashFlow,
  expenses: finance.expenses,
  vendor_payments: finance.vendorPayments,
  withholdings: finance.withholdings,
  adjustments: finance.adjustments,
  members_access: census.membersAccess,
  tickets: operations.tickets,
  amenities: operations.amenities,
  gatehouse: operations.gatehouse,
  visitor_parking: operations.visitorParking,
  announcements: operations.announcements,
  surveys: operations.surveys,
  document_access: operations.documentAccess,
  census: census.census,
  vehicles: census.vehicles,
  parking: census.parking,
}

const missing = REPORTS.filter((report) => !REPORT_RUNNERS[report.key])
if (missing.length) {
  throw new Error(`Reports without a runner: ${missing.map((report) => report.key).join(', ')}`)
}
