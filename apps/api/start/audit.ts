/*
|--------------------------------------------------------------------------
| Audit log
|--------------------------------------------------------------------------
|
| Changes to money, census, permissions and configuration are recorded in
| `audit_logs` by model hooks (docs/audit.md). Each model says when an entry
| is worth it: e.g. the balance of a charge moves with every payment, and that
| is already the payment's entry.
|
*/

import {
  CHARGE_ADJUSTMENT_TYPE_LABELS,
  ROLE_LABELS,
  type ChargeAdjustmentType,
  type EnrollmentRole,
} from '@aptoph/shared'
import { type AuditClient, auditable } from '#services/audit/audit_log'
import AmenityBooking from '#models/amenities/amenity_booking'
import Amenity from '#models/amenities/amenity'
import Announcement from '#models/announcements/announcement'
import Document from '#models/documents/document'
import BillingPeriod from '#models/finance/billing_period'
import Bill from '#models/finance/bill'
import Budget from '#models/finance/budget'
import CashAccount from '#models/finance/cash_account'
import ChargeAdjustment from '#models/finance/charge_adjustment'
import ChargeConcept from '#models/finance/charge_concept'
import Charge from '#models/finance/charge'
import ContributionModule from '#models/finance/contribution_module'
import FeeSchedule from '#models/finance/fee_schedule'
import JournalEntry from '#models/finance/journal_entry'
import LedgerAccount from '#models/finance/ledger_account'
import Payment from '#models/finance/payment'
import RecurringCharge from '#models/finance/recurring_charge'
import VendorPayment from '#models/finance/vendor_payment'
import Vendor from '#models/finance/vendor'
import ParkingStay from '#models/gatehouse/parking_stay'
import Building from '#models/property/building'
import ParkingAssignment from '#models/property/parking_assignment'
import ParkingLottery from '#models/property/parking_lottery'
import ParkingSpot from '#models/property/parking_spot'
import Pet from '#models/property/pet'
import UnitOccupant from '#models/property/unit_occupant'
import Unit from '#models/property/unit'
import Vehicle from '#models/property/vehicle'
import Survey from '#models/surveys/survey'
import Enrollment from '#models/tenants/enrollment'
import Tenant from '#models/tenants/tenant'
import Ticket from '#models/tickets/ticket'

/** "Torre 1 · 302" */
async function unitName(client: AuditClient, unitId: string | null | undefined) {
  if (!unitId) return null
  const row = await client
    .from('units as u')
    .leftJoin('buildings as b', 'b.id', 'u.building_id')
    .where('u.id', unitId)
    .select('u.code', 'b.name as building')
    .first()
  if (!row) return null
  return row.building ? `${row.building} · ${row.code}` : String(row.code)
}

const withUnit = async (client: AuditClient, unitId: string | null, text: string) => {
  const unit = await unitName(client, unitId)
  return unit ? `${text} · ${unit}` : text
}

const month = (value: { toISODate(): string | null } | null | undefined) =>
  value?.toISODate()?.slice(0, 7) ?? ''

// Finance

auditable(Payment, {
  type: 'payments',
  label: (row, client) =>
    withUnit(client, row.unitId, row.number ? `Recibo ${row.number}` : 'Pago reportado'),
  // Applying the credit balance later moves only this
  quiet: ['unappliedAmount'],
})

auditable(Charge, {
  type: 'charges',
  label: (row, client) => withUnit(client, row.unitId, `Cobro ${month(row.period)}`),
  // Monthly billing, interest and the other modules create charges in bulk: their
  // entry is the billing period or the module's own record
  create: (row) => row.sourceType === 'manual',
  // Payments move the balance and the status
  quiet: ['balance', 'status', 'discountAmount'],
})

auditable(ChargeAdjustment, {
  type: 'charge_adjustments',
  label: (row) => CHARGE_ADJUSTMENT_TYPE_LABELS[row.type as ChargeAdjustmentType] ?? row.type,
  // The early payment discount is part of the payment
  create: (row) => row.type !== 'early_payment_discount',
})

auditable(BillingPeriod, {
  type: 'billing_periods',
  label: (row) => `Facturación ${month(row.period)}`,
  quiet: ['totalAmount', 'chargesCount'],
})

auditable(RecurringCharge, {
  type: 'recurring_charges',
  label: (row, client) => withUnit(client, row.unitId, 'Tarifa'),
  // The ones of a fee schedule are recorded as the schedule
  create: (row) => !row.feeScheduleId,
})

auditable(FeeSchedule, {
  type: 'fee_schedules',
  label: (row) => `Cuotas desde ${month(row.effectiveFrom)}`,
})

auditable(ChargeConcept, { type: 'charge_concepts', label: (row) => row.name })
auditable(LedgerAccount, { type: 'ledger_accounts', label: (row) => `${row.code} ${row.name}` })

auditable(JournalEntry, {
  type: 'journal_entries',
  label: (row) => `Comprobante ${row.number}`,
  // The others are posted by payments, bills, billing… and recorded there
  create: (row) => ['manual', 'opening', 'transfer', 'reversal'].includes(row.type),
  update: false,
})

auditable(CashAccount, { type: 'cash_accounts', label: (row) => row.name })
auditable(Vendor, { type: 'vendors', label: (row) => row.name })

auditable(Bill, {
  type: 'bills',
  label: (row) => `Factura ${row.number}`,
  // Paying the bill moves these
  quiet: ['balance', 'status'],
})

auditable(VendorPayment, { type: 'vendor_payments', label: (row) => `Egreso ${row.number}` })
auditable(Budget, { type: 'budgets', label: (row) => `${row.name} ${row.year}` })
auditable(ContributionModule, { type: 'contribution_modules', label: (row) => row.name })

auditable(ParkingStay, {
  type: 'parking_stays',
  label: (row) =>
    [row.number ? `Comprobante ${row.number}` : null, row.plate].filter(Boolean).join(' · '),
  // Entries and exits are the gate's daily work: only exemptions and the
  // corrections (changes that are not the exit itself)
  create: false,
  update: (row, before) => row.settlement === 'exempt' || before.status === undefined,
  delete: false,
})

// Census

auditable(Building, { type: 'buildings', label: (row) => row.name })
auditable(Unit, { type: 'units', label: (row, client) => unitName(client, row.id) })
auditable(UnitOccupant, {
  type: 'unit_occupants',
  label: (row, client) => withUnit(client, row.unitId, row.fullName),
})
auditable(Vehicle, {
  type: 'vehicles',
  label: (row, client) => withUnit(client, row.unitId, row.plate),
})
auditable(Pet, { type: 'pets', label: (row, client) => withUnit(client, row.unitId, row.name) })
auditable(ParkingSpot, { type: 'parking_spots', label: (row) => `Parqueadero ${row.code}` })
auditable(ParkingAssignment, {
  type: 'parking_assignments',
  label: async (row, client) => {
    const spot = await client.from('parking_spots').where('id', row.spotId).select('code').first()
    return withUnit(client, row.unitId, `Parqueadero ${spot?.code ?? ''}`.trim())
  },
})
auditable(ParkingLottery, {
  type: 'parking_lotteries',
  label: (row) => `Sorteo ${row.number}`,
  quiet: ['notifiedCount'],
})

// Access and settings

auditable(Enrollment, {
  type: 'enrollments',
  label: async (row, client) => {
    const user = await client.from('users').where('id', row.userId).select('full_name').first()
    const role = ROLE_LABELS[row.role as EnrollmentRole] ?? row.role
    return user ? `${user.full_name} · ${role}` : role
  },
  // Resending an invitation renews these
  quiet: ['invitationSentAt', 'invitationExpiresAt'],
})

auditable(Tenant, {
  type: 'tenants',
  label: (row) => row.name,
  tenantOf: (row) => row.id,
  create: false,
  delete: false,
})

auditable(Amenity, { type: 'amenities', label: (row) => row.name })

// Communication and operations

auditable(Announcement, {
  type: 'announcements',
  label: (row) => row.title,
  quiet: ['notifiedAt', 'emailedAt', 'emailCount', 'emailSkipped'],
})
auditable(Document, { type: 'documents', label: (row) => row.title, quiet: ['updatedById'] })
auditable(Survey, {
  type: 'surveys',
  label: (row) => row.title,
  quiet: ['remindedAt', 'updatedById'],
})
auditable(AmenityBooking, {
  type: 'amenity_bookings',
  label: (row, client) => withUnit(client, row.unitId, `Reserva ${row.number}`),
  quiet: ['remindedAt'],
})
auditable(Ticket, {
  type: 'tickets',
  label: (row) => `PQRS ${row.number}`,
  // Residents create them; the log follows who handles them
  create: false,
  only: ['status', 'assignedToId', 'priority'],
  delete: false,
})
