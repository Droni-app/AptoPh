import logger from '@adonisjs/core/services/logger'
import drive from '@adonisjs/drive/services/main'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import Tenant from '#models/tenants/tenant'
import User from '#models/auth/user'
import Enrollment from '#models/tenants/enrollment'
import Building from '#models/property/building'
import Unit from '#models/property/unit'
import UnitOccupant from '#models/property/unit_occupant'
import Vehicle from '#models/property/vehicle'
import Pet from '#models/property/pet'
import ChargeConcept from '#models/finance/charge_concept'
import Payment from '#models/finance/payment'
import Budget from '#models/finance/budget'
import BudgetItem from '#models/finance/budget_item'
import RecurringCharge from '#models/finance/recurring_charge'
import Vendor from '#models/finance/vendor'
import {
  normalizePlate,
  quoteParking,
  toCents,
  type ParkingSettings,
  type VisitorParkingSettings,
} from '@aptoph/shared'
import { BillingService } from '#services/finance/billing'
import { CashService } from '#services/finance/cash'
import { ChargeService } from '#services/finance/charges'
import { FeeCalculator } from '#services/finance/fees'
import { type BillInput, PayablesService } from '#services/finance/payables'
import { PaymentService } from '#services/finance/payments'
import { FinanceScope } from '#services/finance/scope'
import Amenity from '#models/amenities/amenity'
import AmenityBooking from '#models/amenities/amenity_booking'
import Announcement from '#models/announcements/announcement'
import AnnouncementRead from '#models/announcements/announcement_read'
import Ticket from '#models/tickets/ticket'
import TicketComment from '#models/tickets/ticket_comment'
import Visit from '#models/gatehouse/visit'
import ParkingStay from '#models/gatehouse/parking_stay'
import ParkingApplication from '#models/property/parking_application'
import ParkingAssignment from '#models/property/parking_assignment'
import ParkingLottery from '#models/property/parking_lottery'
import ParkingSpot from '#models/property/parking_spot'
import { splitByDay } from '#services/gatehouse/visitor_parking'
import Parcel from '#models/gatehouse/parcel'
import DocumentFile from '#models/documents/document'
import DocumentFolder from '#models/documents/document_folder'
import Survey from '#models/surveys/survey'
import SurveyOption from '#models/surveys/survey_option'
import SurveyQuestion from '#models/surveys/survey_question'
import Attachment from '#models/files/attachment'
import AuditLog from '#models/tenants/audit_log'

/**
 * PUBLIC DEMO: "Altos del Parque (Demo)", a small conjunto with records in every
 * module, and two users whose credentials are published on the landing page:
 *
 *   admin@demo.test      → backoffice (administrator)
 *   residente@demo.test  → resident web app (owner of Torre 1 · 302)
 *
 * Development only: production starts empty (README, Despliegue). Each run wipes the demo
 * conjunto's data and recreates it, so whatever visitors change is reset and the
 * dates stay relative to today. The demo users only belong to this conjunto.
 *
 *   node ace db:seed --files database/seeders/demo_seeder.ts
 */

export const DEMO_PASSWORD = 'demo1234'
export const DEMO_SLUG = 'demo'

const TOWERS = 3
const FLOORS = 6
/** Private area (m²) of apartments 01..04 on every floor */
const AREAS = [78.5, 62.3, 62.3, 78.5]

/** Tables with demo data, children first (all have tenant_id) */
const TENANT_TABLES = [
  'audit_logs',
  'survey_answers',
  'survey_tallies',
  'survey_responses',
  'survey_options',
  'survey_questions',
  'surveys',
  'document_access_logs',
  'document_units',
  'parking_stays',
  'parking_assignments',
  'parking_applications',
  'parking_lotteries',
  'parking_spots',
  'attachments',
  'announcement_reads',
  'announcement_buildings',
  'email_quotas',
  'announcements',
  'ticket_comments',
  'tickets',
  'vendor_payment_allocations',
  'charge_adjustments',
  'payment_allocations',
  'journal_lines',
  'journal_entries',
  'vendor_payments',
  'bill_lines',
  'bills',
  'payments',
  'amenity_bookings',
  'amenities',
  'charges',
  'billing_periods',
  'recurring_charges',
  'fee_schedules',
  'budget_items',
  'budgets',
  'contribution_module_units',
  'contribution_modules',
  'charge_concepts',
  'cash_accounts',
  'vendors',
  'ledger_accounts',
  'document_sequences',
  'visits',
  'parcels',
  'documents',
  'document_folders',
  'pets',
  'vehicles',
  'unit_occupants',
]

const FIRST_NAMES = [
  'Sofía',
  'Mateo',
  'Valentina',
  'Santiago',
  'Isabella',
  'Sebastián',
  'Mariana',
  'Nicolás',
  'Gabriela',
  'Samuel',
  'Daniela',
  'Alejandro',
  'Camila',
  'Andrés',
  'Luciana',
  'Felipe',
  'Manuela',
  'Juan Pablo',
  'Sara',
  'Tomás',
  'Antonella',
  'David',
  'Paula',
  'Martín',
]
const LAST_NAMES = [
  'Rodríguez',
  'Gómez',
  'González',
  'Martínez',
  'García',
  'López',
  'Hernández',
  'Sánchez',
  'Ramírez',
  'Pérez',
  'Torres',
  'Díaz',
  'Vargas',
  'Moreno',
  'Rojas',
  'Castro',
  'Ortiz',
  'Jiménez',
  'Muñoz',
  'Suárez',
  'Romero',
  'Herrera',
  'Medina',
  'Aguilar',
]
const CAR_BRANDS: Array<[string, string]> = [
  ['Mazda', 'CX-30'],
  ['Renault', 'Duster'],
  ['Chevrolet', 'Onix'],
  ['Kia', 'Picanto'],
  ['Toyota', 'Corolla Cross'],
  ['Volkswagen', 'T-Cross'],
  ['Nissan', 'Kicks'],
  ['Suzuki', 'Swift'],
]
const COLORS = ['Blanco', 'Gris', 'Negro', 'Rojo', 'Azul', 'Plata']
const LETTERS = 'BCDFGHJKLMNPRSTVWXYZ'

const personName = (i: number) =>
  `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 7) % LAST_NAMES.length]}`
const plate = (i: number) =>
  `${LETTERS[i % 20]}${LETTERS[(i * 3) % 20]}${LETTERS[(i * 7) % 20]}${String(100 + ((i * 37) % 900))}`
const money = (value: number) => value.toFixed(2)

export default class extends BaseSeeder {
  static environment = ['development']

  async run() {
    const tenant = await Tenant.updateOrCreate(
      { slug: DEMO_SLUG },
      {
        name: 'Altos del Parque (Demo)',
        legalName: 'Conjunto Residencial Altos del Parque P.H.',
        taxId: '900.000.000-0',
        propertyType: 'residential',
        address: 'Calle 100 # 10-20',
        city: 'Bogotá',
        countryCode: 'CO',
        timezone: 'America/Bogota',
        currency: 'COP',
        status: 'active',
        deletedAt: null,
      }
    )

    const admin = await User.updateOrCreate(
      { email: 'admin@demo.test' },
      { fullName: 'Diana Administradora', password: DEMO_PASSWORD, isPlatformAdmin: false }
    )
    const resident = await User.updateOrCreate(
      { email: 'residente@demo.test' },
      { fullName: 'Camilo Residente', password: DEMO_PASSWORD, isPlatformAdmin: false }
    )
    // Staff: sees in the back-office only the PQRS assigned to them
    const staff = await User.updateOrCreate(
      { email: 'mantenimiento@demo.test' },
      { fullName: 'Jorge Mantenimiento', password: DEMO_PASSWORD, isPlatformAdmin: false }
    )
    // Guard: the gate and the visitor parking
    const guard = await User.updateOrCreate(
      { email: 'vigilancia@demo.test' },
      { fullName: 'Luis Vigilante', password: DEMO_PASSWORD, isPlatformAdmin: false }
    )

    let builder: DemoBuilder | null = null
    await db.transaction(async (trx) => {
      // The demo users only exist in the demo conjunto
      await trx
        .from('enrollments')
        .whereIn('user_id', [admin.id, resident.id, staff.id, guard.id])
        .whereNot('tenant_id', tenant.id)
        .delete()
      await trx.from('enrollments').where('tenant_id', tenant.id).delete()
      await Enrollment.createMany(
        [
          { tenantId: tenant.id, userId: admin.id, role: 'administrator', status: 'active' },
          { tenantId: tenant.id, userId: resident.id, role: 'resident', status: 'active' },
          { tenantId: tenant.id, userId: staff.id, role: 'staff', status: 'active' },
          { tenantId: tenant.id, userId: guard.id, role: 'security_guard', status: 'active' },
        ],
        { client: trx }
      )

      await this.wipe(trx, tenant.id)
      builder = new DemoBuilder(trx, tenant, admin, resident, staff, guard)
      await builder.build()
    })

    // Files visitors uploaded to the demo (its rows were wiped above)
    try {
      await drive.use().deleteAll(`${DEMO_SLUG}/`)
    } catch (err) {
      logger.warn({ err }, 'could not delete the demo files')
    }
    // The files of the demo documents, once the old ones are gone
    for (const file of (builder as DemoBuilder | null)?.files ?? []) {
      try {
        await drive.use().put(file.key, file.body, { contentType: 'application/pdf' })
      } catch (err) {
        logger.warn({ err, key: file.key }, 'could not write a demo document')
      }
    }
  }

  private async wipe(trx: TransactionClientContract, tenantId: string) {
    for (const table of TENANT_TABLES) {
      await trx.from(table).where('tenant_id', tenantId).delete()
    }
    await trx.from('units').where('tenant_id', tenantId).update({ parent_unit_id: null })
    await trx.from('units').where('tenant_id', tenantId).delete()
    await trx.from('buildings').where('tenant_id', tenantId).delete()
  }
}

/** A one-page PDF with a title and some lines, for the demo documents */
function demoPdf(title: string, lines: string[]) {
  const ascii = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7e]/g, '')
      .replace(/[()\\]/g, (char) => `\\${char}`)
  const content = [
    'BT /F1 20 Tf 60 760 Td',
    `(${ascii(title)}) Tj`,
    '/F1 11 Tf 0 -36 Td',
    ...lines.flatMap((line) => [`(${ascii(line)}) Tj`, '0 -18 Td']),
    'ET',
  ].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((object, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

class DemoBuilder {
  /** Files to write once the transaction commits (see DemoSeeder.run) */
  files: Array<{ key: string; body: Buffer }> = []
  private client: { client: TransactionClientContract }
  private trx: TransactionClientContract
  private now: DateTime
  private today: DateTime

  constructor(
    trx: TransactionClientContract,
    private tenant: Tenant,
    private admin: User,
    private resident: User,
    private staff: User,
    private guard: User
  ) {
    this.client = { client: trx }
    this.trx = trx
    this.now = DateTime.now().setZone(tenant.timezone)
    this.today = this.now.startOf('day')
  }

  private get scope() {
    return { tenantId: this.tenant.id }
  }

  async build() {
    const { apartments, myUnit } = await this.structure()
    const occupied = await this.people(apartments, myUnit)
    await this.finance(apartments, occupied, myUnit)
    await this.amenities(occupied, myUnit)
    await this.communication(occupied, myUnit)
    await this.security(occupied, myUnit)
    await this.visitorParking(occupied, myUnit)
    await this.parkingSpots(occupied, myUnit)
    await this.documents(myUnit)
    await this.surveys(apartments, myUnit)
    await this.audit(myUnit)
  }

  /** 3 towers × 6 floors × 4 apartments, plus parking spots and storage rooms */
  private async structure() {
    const buildings = await Building.createMany(
      Array.from({ length: TOWERS }, (_, i) => ({
        ...this.scope,
        name: `Torre ${i + 1}`,
        floors: FLOORS,
        sortOrder: i + 1,
      })),
      this.client
    )

    const totalArea = AREAS.reduce((a, b) => a + b, 0) * FLOORS * TOWERS
    const rows = buildings
      .flatMap((building, t) =>
        Array.from({ length: FLOORS }, (_, f) =>
          AREAS.map((area, p) => {
            const index = t * FLOORS * AREAS.length + f * AREAS.length + p
            return {
              ...this.scope,
              buildingId: building.id,
              code: `${f + 1}0${p + 1}`,
              type: 'apartment' as const,
              floor: f + 1,
              privateArea: area.toFixed(2),
              ownershipCoefficient: (area / totalArea).toFixed(6),
              // Every ninth apartment is vacant
              status: index % 9 === 4 ? ('vacant' as const) : ('occupied' as const),
            }
          })
        )
      )
      .flat()
    // Rounding leaves a few millionths over or under: the last apartment absorbs them
    const micro = rows.map((row) => Math.round(Number(row.ownershipCoefficient) * 1e6))
    const last = rows.at(-1)!
    last.ownershipCoefficient = (
      (micro.at(-1)! + 1e6 - micro.reduce((a, b) => a + b, 0)) /
      1e6
    ).toFixed(6)
    const apartments = await Unit.createMany(rows, this.client)

    const myUnit = apartments.find((u) => u.buildingId === buildings[0]!.id && u.code === '302')!

    // Parking spots and storage rooms linked to the first apartments
    await Unit.createMany(
      [
        ...Array.from({ length: 24 }, (_, i) => ({
          ...this.scope,
          code: `P-${String(i + 1).padStart(2, '0')}`,
          type: 'parking' as const,
          privateArea: '12.50',
          status: 'occupied' as const,
          parentUnitId: (i === 4 ? myUnit : apartments[i * 3]!).id,
        })),
        ...Array.from({ length: 8 }, (_, i) => ({
          ...this.scope,
          code: `D-${String(i + 1).padStart(2, '0')}`,
          type: 'storage' as const,
          privateArea: '3.20',
          status: 'occupied' as const,
          parentUnitId: (i === 2 ? myUnit : apartments[i * 8 + 1]!).id,
          notes: i === 2 ? 'Depósito en sótano, junto al cuarto de bombas.' : null,
        })),
      ],
      this.client
    )

    return { apartments, myUnit }
  }

  /** Occupants, vehicles and pets. Returns the occupied apartments. */
  private async people(apartments: Unit[], myUnit: Unit) {
    const occupied = apartments.filter((u) => u.status === 'occupied')
    const occupants = occupied.flatMap((unit, i): Array<Partial<UnitOccupant>> => {
      if (unit.id === myUnit.id) {
        return [
          {
            ...this.scope,
            unitId: unit.id,
            userId: this.resident.id,
            fullName: this.resident.fullName,
            email: this.resident.email,
            phone: '300 000 0000',
            documentType: 'CC',
            documentNumber: '1000000000',
            relationship: 'owner' as const,
            isPrimaryContact: true,
            isBillingResponsible: true,
          },
          {
            ...this.scope,
            unitId: unit.id,
            fullName: 'Laura Residente',
            relationship: 'family_member' as const,
          },
          {
            ...this.scope,
            unitId: unit.id,
            fullName: 'Tomás Residente',
            relationship: 'family_member' as const,
          },
        ]
      }
      const rented = i % 4 === 1
      const main = {
        ...this.scope,
        unitId: unit.id,
        fullName: personName(i),
        documentType: 'CC',
        documentNumber: String(52_000_000 + i * 1_337),
        phone: `31${i % 10} ${String(100 + i).padStart(3, '0')} ${String(1000 + i * 7).slice(-4)}`,
        email: `ocupante${i + 1}@demo.test`,
        relationship: rented ? ('renter' as const) : ('owner' as const),
        isPrimaryContact: true,
        isBillingResponsible: true,
        startsOn: this.today.minus({ months: 3 + (i % 30) }).startOf('month'),
      }
      const extra =
        i % 3 === 0
          ? [
              {
                ...this.scope,
                unitId: unit.id,
                fullName: personName(i + 11),
                relationship: 'family_member' as const,
              },
            ]
          : []
      return [main, ...extra]
    })
    await UnitOccupant.createMany(occupants, this.client)

    const vehicles: Array<Partial<Vehicle>> = occupied
      .filter((_, i) => i % 2 === 0)
      .map((unit, i) => {
        const [brand, model] = CAR_BRANDS[i % CAR_BRANDS.length]!
        const moto = i % 5 === 3
        return {
          ...this.scope,
          unitId: unit.id,
          plate: moto ? `${plate(i).slice(0, 3)}${String(10 + i)}A` : plate(i),
          type: moto ? ('motorcycle' as const) : ('car' as const),
          brand: moto ? 'Yamaha' : brand,
          model: moto ? 'NMAX' : model,
          color: COLORS[i % COLORS.length],
        }
      })
      .filter((v) => v.unitId !== myUnit.id)
    vehicles.push(
      {
        ...this.scope,
        unitId: myUnit.id,
        plate: 'DEM302',
        type: 'car',
        brand: 'Mazda',
        model: '3',
        color: 'Gris',
      },
      {
        ...this.scope,
        unitId: myUnit.id,
        plate: 'DMO30F',
        type: 'bicycle',
        brand: 'GW',
        model: 'Zebra',
        color: 'Negro',
      }
    )
    await Vehicle.createMany(vehicles, this.client)

    const petNames = [
      'Max',
      'Luna',
      'Rocky',
      'Kira',
      'Simón',
      'Nala',
      'Toby',
      'Mía',
      'Bruno',
      'Lola',
    ]
    await Pet.createMany(
      [
        {
          ...this.scope,
          unitId: myUnit.id,
          name: 'Lucas',
          species: 'dog' as const,
          breed: 'Beagle',
        },
        ...occupied
          .filter((u, i) => i % 4 === 2 && u.id !== myUnit.id)
          .map((unit, i) => ({
            ...this.scope,
            unitId: unit.id,
            name: petNames[i % petNames.length]!,
            species: i % 3 === 1 ? ('cat' as const) : ('dog' as const),
            breed: i % 3 === 1 ? 'Criollo' : ['Labrador', 'French poodle', 'Schnauzer'][i % 3]!,
          })),
      ],
      this.client
    )

    return occupied
  }

  /**
   * Finance through the real services, so the books add up: bank and petty
   * cash, an approved budget, fees from the calculator, three billed months with
   * late interest, payments, vendor bills and payment vouchers. Most units are up
   * to date; some owe the current month, a few are overdue, one paid ahead.
   */
  private async finance(apartments: Unit[], occupied: Unit[], myUnit: Unit) {
    // The chart of accounts was wiped: prepare finance again
    const settings = { ...(this.tenant.settings ?? {}) }
    delete settings.financeSetupVersion
    this.tenant.settings = settings
    const scope = await FinanceScope.open(this.trx, this.tenant, this.admin.id)
    this.financeScope = scope
    const account = (code: string) => scope.accounts.all().find((row) => row.code === code)!
    const concept = (code: string) =>
      ChargeConcept.query(this.client)
        .where('tenant_id', this.tenant.id)
        .where('code', code)
        .firstOrFail()
    const fee = await concept('ordinary_fee')
    const extraordinary = await concept('extraordinary_fee')
    const fine = await concept('fine')
    const parking = await concept('parking')
    const cents = (pesos: number) => Math.round(pesos * 100)
    const iso = (date: DateTime) => date.toISODate()!
    const notAfterNow = (date: DateTime) => (date > this.now ? this.now.minus({ hours: 2 }) : date)

    const thisMonth = this.today.startOf('month')
    const months = [thisMonth.minus({ months: 2 }), thisMonth.minus({ months: 1 }), thisMonth]
    const start = months[0]!.minus({ days: 1 })

    // Banks and petty cash, with their opening balance
    const cash = new CashService(scope)
    const bank = await cash.create({
      name: 'Bancolombia ahorros',
      type: 'bank',
      bankName: 'Bancolombia',
      accountKind: 'savings',
      accountNumber: '****4821',
      openingBalance: cents(48_500_000),
      openingDate: iso(start),
    })
    const pettyCash = await cash.create({
      name: 'Caja menor',
      type: 'cash',
      openingBalance: cents(500_000),
      openingDate: iso(start),
    })
    // Where the visitor parking paid at the gate goes
    const gateCash = await cash.create({ name: 'Caja portería', type: 'cash' })
    this.gateCashId = gateCash.id

    // Budget approved by the assembly
    const budgetLines: Array<[string, string, number]> = [
      ['417005', 'Cuotas de administración', 345_600_000],
      ['417015', 'Parqueaderos adicionales', 2_160_000],
      ['513505', 'Vigilancia y aseo', 223_200_000],
      ['513530', 'Energía zonas comunes', 21_600_000],
      ['513525', 'Acueducto zonas comunes', 10_800_000],
      ['514515', 'Mantenimiento de ascensores', 18_000_000],
      ['511010', 'Revisoría fiscal', 14_400_000],
      ['511095', 'Administración', 38_400_000],
      ['513005', 'Póliza de áreas comunes', 9_600_000],
      ['514540', 'Jardinería', 7_200_000],
      ['530505', 'Gastos bancarios', 1_800_000],
      ['519525', 'Elementos de aseo y cafetería', 3_600_000],
    ]
    const budget = await Budget.create(
      {
        ...this.scope,
        year: this.today.year,
        name: `Presupuesto ${this.today.year}`,
        status: 'approved',
        reserveFundRate: '1.00',
        approvedOn: DateTime.fromObject({ year: this.today.year, month: 3, day: 15 }),
        approvalReference: 'Acta 12 · Asamblea general ordinaria',
        notes: 'Incremento del 9 % frente al año anterior.',
      },
      this.client
    )
    await BudgetItem.createMany(
      budgetLines.map(([code, description, amount]) => ({
        ...this.scope,
        budgetId: budget.id,
        accountId: account(code).id,
        description,
        annualAmount: money(amount),
      })),
      this.client
    )

    // Fees: coefficient of each apartment over the budget, from two months ago
    await FeeCalculator.apply(scope, {
      conceptId: fee.id,
      method: 'coefficient',
      effectiveFrom: iso(months[0]!),
      budgetId: budget.id,
      unitTypes: ['apartment'],
      rounding: 100,
      roundingMode: 'nearest',
    })
    // Three apartments rent an extra parking spot
    await RecurringCharge.createMany(
      [apartments[1]!, apartments[6]!, apartments[13]!].map((unit) => ({
        ...this.scope,
        unitId: unit.id,
        chargeConceptId: parking.id,
        amount: '60000.00',
        description: 'Parqueadero adicional',
        startsOn: months[0]!,
        createdById: this.admin.id,
      })),
      this.client
    )

    type Plan = 'paid' | 'partial' | 'pending' | 'ahead'
    /** What each unit did each month: [two months ago, last month, this month] */
    const planFor = (unit: Unit, i: number): Plan[] => {
      if (unit.id === myUnit.id) return ['paid', 'partial', 'pending']
      if (unit.status === 'vacant') return ['pending', 'pending', 'pending']
      if (unit.id === occupied[3]!.id) return ['paid', 'paid', 'ahead']
      if (i % 7 === 3) return ['paid', 'pending', 'pending']
      if (i % 5 === 1) return ['paid', 'paid', 'pending']
      return ['paid', 'paid', 'paid']
    }
    const methods = ['pse', 'bank_transfer', 'pse', 'consignment', 'card'] as const
    const billing = new BillingService(scope)
    const payments = new PaymentService(scope)
    const charges = new ChargeService(scope)
    const payables = new PayablesService(scope)
    const openBalance = async (unitId: string) => {
      const [row] = await this.trx
        .from('charges')
        .where('unit_id', unitId)
        .whereIn('status', ['pending', 'partially_paid'])
        .sum('balance as total')
      return toCents(row.total)
    }

    const vendors = await Vendor.createMany(
      [
        {
          name: 'Vigilancia Andina S.A.S.',
          documentType: 'NIT' as const,
          documentNumber: '900123456-1',
          code: '513505',
          email: 'facturacion@vigilancia-andina.test',
        },
        {
          name: 'Aseo Integral del Norte S.A.S.',
          documentType: 'NIT' as const,
          documentNumber: '900654321-7',
          code: '513505',
          email: null,
        },
        {
          name: 'Ascensores Técnicos S.A.S.',
          documentType: 'NIT' as const,
          documentNumber: '901112223-4',
          code: '514515',
          email: null,
        },
        {
          name: 'Energía del Valle E.S.P.',
          documentType: 'NIT' as const,
          documentNumber: '890900321-5',
          code: '513530',
          email: null,
        },
        {
          name: 'Marta Lucía Gómez',
          documentType: 'CC' as const,
          documentNumber: '43512876',
          code: '511010',
          email: null,
        },
        {
          name: 'Ferretería El Tornillo',
          documentType: 'NIT' as const,
          documentNumber: '800765432-1',
          code: '514595',
          email: null,
        },
      ].map(({ code, ...vendor }) => ({
        ...this.scope,
        ...vendor,
        defaultAccountId: account(code).id,
        bankName: vendor.documentType === 'NIT' ? 'Banco de Bogotá' : 'Davivienda',
        bankAccountKind: 'checking' as const,
        isActive: true,
      })),
      this.client
    )
    const [guards, cleaning, elevators, power, auditor, hardware] = vendors

    for (const [m, period] of months.entries()) {
      const current = m === 2
      await billing.generate(iso(period))

      if (m === 1) {
        // Second installment of the façade works and a fine
        const extra = await charges.insert([
          ...apartments
            .filter((_, i) => i % 2 === 0)
            .map((unit) => ({
              unitId: unit.id,
              concept: extraordinary,
              amount: Math.round(Number(unit.ownershipCoefficient) * 9_000_000) * 100,
              period: iso(period),
              dueOn: iso(period.set({ day: 25 })),
              description: 'Cuota 2 de 4 · pintura e impermeabilización de fachada',
              sourceType: 'manual' as const,
            })),
          {
            unitId: occupied[9]!.id,
            concept: fine,
            amount: cents(150_000),
            period: iso(period),
            dueOn: iso(period.set({ day: 20 })),
            description: 'Ruido después de las 10 p. m. (reincidencia)',
            sourceType: 'manual' as const,
          },
        ])
        await charges.post(extra, {
          date: iso(period.set({ day: 3 })),
          type: 'charge',
          description: 'Cuota extraordinaria fachada (2 de 4) y multa',
        })
      }

      for (const [i, unit] of apartments.entries()) {
        const plan = planFor(unit, i)[m]!
        if (plan === 'pending') continue
        const owed = await openBalance(unit.id)
        if (owed === 0) continue
        const installmentPaid = unit.id !== myUnit.id && i % 3 !== 0
        let amount = owed
        if (plan === 'partial') amount = Math.round((owed * 0.4) / 10000) * 10000
        else if (plan === 'ahead') amount = owed * 2
        else if (m === 1 && i % 2 === 0 && !installmentPaid) {
          const [row] = await this.trx
            .from('charges')
            .where('unit_id', unit.id)
            .where('charge_concept_id', extraordinary.id)
            .whereIn('status', ['pending', 'partially_paid'])
            .sum('balance as total')
          amount = owed - toCents(row.total)
        }
        if (amount <= 0) continue
        const method = methods[i % methods.length]!
        const paidAt = notAfterNow(
          period
            .set({ day: 10 })
            .minus({ days: 1 + (i % 8) })
            .set({ hour: 9 + (i % 10) })
        )
        await payments.register({
          unitId: unit.id,
          amount,
          paidAt,
          method,
          reference: `PAY-${paidAt.toFormat('yyMM')}-${1000 + i}`,
          cashAccountId: bank.id,
        })
      }

      // Vendor bills of the month; past months get paid
      const issued = period.set({ day: 2 })
      const due = period.set({ day: 17 })
      const bill = (
        vendor: Vendor,
        input: Partial<BillInput> & { amount: number; description: string; code: string }
      ) =>
        payables.createBill({
          vendorId: vendor.id,
          number: `${vendor.name.slice(0, 2).toUpperCase()}-${period.toFormat('yyMM')}`,
          issuedOn: iso(issued),
          dueOn: iso(due),
          description: input.description,
          lines: [{ accountId: account(input.code).id, amount: input.amount }],
          taxAmount: input.taxAmount,
          withholdingIncomeTax: input.withholdingIncomeTax,
          withholdingVat: input.withholdingVat,
          withholdingIca: input.withholdingIca,
        })
      const label = period.setLocale('es').toFormat('LLLL')
      const bills = [
        await bill(guards!, {
          code: '513505',
          amount: cents(12_600_000),
          description: `Servicio de vigilancia 24 h · ${label}`,
          withholdingIncomeTax: cents(252_000),
          withholdingIca: cents(88_200),
        }),
        await bill(power!, {
          code: '513530',
          amount: cents(1_700_000 + m * 45_000),
          description: `Energía zonas comunes · ${label}`,
        }),
      ]
      if (!current) {
        bills.push(
          await bill(cleaning!, {
            code: '513505',
            amount: cents(6_000_000),
            description: `Servicio de aseo · ${label}`,
            withholdingIncomeTax: cents(120_000),
          }),
          await bill(elevators!, {
            code: '514515',
            amount: cents(1_260_504),
            taxAmount: cents(239_496),
            description: `Mantenimiento preventivo de ascensores · ${label}`,
            withholdingIncomeTax: cents(50_420),
            withholdingVat: cents(35_924),
          }),
          await bill(auditor!, {
            code: '511010',
            amount: cents(1_200_000),
            description: `Honorarios revisoría fiscal · ${label}`,
            withholdingIncomeTax: cents(120_000),
          })
        )
        for (const paid of bills) {
          await payables.pay({
            vendorId: paid.vendorId,
            cashAccountId: bank.id,
            paidOn: iso(due.minus({ days: 1 })),
            method: 'bank_transfer',
            reference: `Transferencia ${paid.number}`,
            allocations: [{ billId: paid.id, amount: toCents(paid.netAmount) }],
          })
        }
      }
      if (m === 1) {
        // Bought and paid on the spot from petty cash
        await payables.createBill({
          vendorId: hardware!.id,
          number: 'FE-30871',
          issuedOn: iso(period.set({ day: 12 })),
          dueOn: iso(period.set({ day: 12 })),
          description: 'Bombillos LED y cinta antideslizante para escaleras',
          lines: [{ accountId: account('514595').id, amount: cents(185_000) }],
          payNow: {
            cashAccountId: pettyCash.id,
            paidOn: iso(period.set({ day: 12 })),
            method: 'cash',
          },
        })
      }
    }

    // A transfer reported by the resident, waiting for the administration to confirm it
    await Payment.create(
      {
        ...this.scope,
        unitId: myUnit.id,
        amount: '200000.00',
        paidAt: this.now.minus({ days: 1 }),
        method: 'bank_transfer',
        reference: 'Transferencia Bancolombia 88214',
        status: 'pending_review',
        registeredById: this.resident.id,
        unappliedAmount: '0.00',
      },
      this.client
    )
  }

  private financeScope!: FinanceScope
  private gateCashId: string | null = null

  private async amenities(occupied: Unit[], myUnit: Unit) {
    const [salon, bbq, gym, pool, kiosk] = await Amenity.createMany(
      [
        {
          ...this.scope,
          name: 'Salón social',
          description: 'Salón para 60 personas con cocineta, sonido y baños.',
          capacity: 60,
          bookingMode: 'shifts',
          bookingFee: '80000.00',
          externalFee: '150000.00',
          depositAmount: '200000.00',
          paymentMode: 'prepaid',
          requiresApproval: true,
          allowDelinquent: false,
          allowGuests: true,
          allowExternal: true,
          color: '#7c3aed',
          terms:
            'Música hasta las 11:00 p. m. Se entrega limpio y con el mobiliario en su lugar. ' +
            'Los daños se descuentan del depósito.',
          rules: {
            shifts: [
              { id: 'manana', name: 'Mañana', startsAt: '08:00', endsAt: '13:00' },
              { id: 'tarde', name: 'Tarde', startsAt: '13:00', endsAt: '18:00' },
              { id: 'noche', name: 'Noche', startsAt: '18:00', endsAt: '23:00' },
            ],
            minNoticeHours: 48,
            maxDaysAhead: 120,
            bufferMinutes: 60,
            maxActivePerUnit: 2,
            cancelHours: 72,
          },
          isActive: true,
        },
        {
          ...this.scope,
          name: 'Zona BBQ',
          description: 'Asador a gas, mesas y pérgola junto al parque infantil.',
          capacity: 20,
          bookingMode: 'hours',
          bookingFee: '15000.00',
          paymentMode: 'statement',
          requiresApproval: true,
          allowDelinquent: true,
          allowGuests: true,
          allowExternal: false,
          color: '#ea580c',
          rules: {
            opensAt: '10:00',
            closesAt: '21:00',
            slotMinutes: 60,
            minHours: 2,
            maxHours: 4,
            bufferMinutes: 30,
            maxPerMonthPerUnit: 2,
            cancelHours: 24,
          },
          isActive: true,
        },
        {
          ...this.scope,
          name: 'Gimnasio',
          description: 'Máquinas cardiovasculares y zona de pesas.',
          capacity: 8,
          bookingMode: 'hours',
          bookingFee: null,
          paymentMode: 'statement',
          requiresApproval: false,
          allowDelinquent: true,
          allowGuests: false,
          allowExternal: false,
          color: '#0d9488',
          rules: { opensAt: '05:00', closesAt: '22:00', maxHours: 1, maxDaysAhead: 7 },
          isActive: true,
        },
        {
          ...this.scope,
          name: 'Piscina',
          description: 'Piscina climatizada. Cerrada los lunes por mantenimiento.',
          capacity: 25,
          bookingMode: 'hours',
          bookingFee: null,
          paymentMode: 'statement',
          requiresApproval: false,
          allowDelinquent: true,
          allowGuests: false,
          allowExternal: false,
          color: '#2563eb',
          rules: { opensAt: '08:00', closesAt: '20:00', maxHours: 2, closedOn: ['monday'] },
          isActive: true,
        },
        {
          ...this.scope,
          name: 'Kiosko campestre',
          description: 'Kiosko con fogón de leña en la zona verde del conjunto.',
          capacity: 30,
          bookingMode: 'days',
          bookingFee: '50000.00',
          paymentMode: 'statement',
          requiresApproval: true,
          allowDelinquent: false,
          allowGuests: true,
          allowExternal: false,
          color: '#65a30d',
          rules: { opensAt: '08:00', closesAt: '22:00', maxDays: 2, minNoticeHours: 24 },
          isActive: true,
        },
      ],
      this.client
    )

    const at = (days: number, hour: number) =>
      this.today.plus({ days }).set({ hour, minute: 0, second: 0, millisecond: 0 })

    const salonCharge = await new ChargeService(this.financeScope).create({
      unitId: myUnit.id,
      conceptCode: 'amenity_booking',
      amount: 16_000_000,
      dueOn: at(5, 0).toISODate()!,
      description: 'Salón social · tarde y noche',
      sourceType: 'amenity_booking',
      idempotencyKey: 'booking:demo-salon',
    })

    const unit = (i: number) => occupied[i % occupied.length]!.id
    let number = 0
    const booking = (
      amenity: Amenity,
      values: Partial<AmenityBooking> & { startsAt: DateTime; endsAt: DateTime },
      bufferMinutes = 0
    ) => ({
      ...this.scope,
      number: ++number,
      amenityId: amenity.id,
      bookingType: 'resident' as const,
      requestedById: this.admin.id,
      blockedUntil: values.endsAt.plus({ minutes: bufferMinutes }),
      feeAmount: '0.00',
      depositAmount: '0.00',
      paymentMode: amenity.paymentMode,
      ...values,
    })
    await AmenityBooking.createMany(
      [
        booking(
          salon!,
          {
            unitId: myUnit.id,
            requestedById: this.resident.id,
            startsAt: at(6, 13),
            endsAt: at(6, 23),
            guestsCount: 40,
            notes: 'Cumpleaños',
            status: 'approved',
            feeAmount: '160000.00',
            paymentMode: 'statement',
            chargeId: salonCharge.id,
            reviewedById: this.admin.id,
            reviewedAt: this.now,
          },
          60
        ),
        booking(
          salon!,
          {
            unitId: unit(11),
            bookingType: 'guest',
            holderName: 'Lucía Méndez',
            holderPhone: '3105550101',
            startsAt: at(9, 18),
            endsAt: at(9, 23),
            guestsCount: 35,
            notes: 'Grado de la sobrina',
            status: 'pending',
            feeAmount: '80000.00',
            depositAmount: '200000.00',
            paymentReference: 'Nequi 4471',
          },
          60
        ),
        booking(
          salon!,
          {
            bookingType: 'external',
            unitId: null,
            holderName: 'Fundación Manos Unidas',
            holderDocument: '900123456',
            holderEmail: 'eventos@manosunidas.test',
            startsAt: at(13, 8),
            endsAt: at(13, 13),
            guestsCount: 50,
            status: 'pending',
            feeAmount: '150000.00',
            depositAmount: '200000.00',
          },
          60
        ),
        booking(
          bbq!,
          {
            unitId: unit(5),
            startsAt: at(2, 12),
            endsAt: at(2, 16),
            guestsCount: 12,
            status: 'pending',
            feeAmount: '60000.00',
          },
          30
        ),
        booking(
          bbq!,
          {
            unitId: unit(14),
            startsAt: at(9, 13),
            endsAt: at(9, 16),
            guestsCount: 18,
            status: 'pending',
            feeAmount: '45000.00',
          },
          30
        ),
        booking(
          salon!,
          {
            unitId: unit(21),
            startsAt: at(-4, 18),
            endsAt: at(-4, 23),
            guestsCount: 50,
            status: 'approved',
            feeAmount: '80000.00',
            paymentMode: 'statement',
            reviewedById: this.admin.id,
          },
          60
        ),
        booking(salon!, {
          unitId: unit(30),
          startsAt: at(15, 8),
          endsAt: at(15, 13),
          guestsCount: 30,
          status: 'rejected',
          feeAmount: '80000.00',
          reviewNote: 'La unidad tiene saldo vencido.',
          reviewedById: this.admin.id,
        }),
        booking(salon!, {
          bookingType: 'block',
          unitId: null,
          startsAt: at(20, 8),
          endsAt: at(20, 23),
          status: 'approved',
          notes: 'Pintura del salón',
          paymentMode: null,
        }),
        booking(gym!, {
          unitId: myUnit.id,
          requestedById: this.resident.id,
          startsAt: at(1, 6),
          endsAt: at(1, 7),
          guestsCount: 1,
          status: 'approved',
        }),
        booking(pool!, {
          unitId: unit(8),
          startsAt: at(3, 10),
          endsAt: at(3, 12),
          guestsCount: 4,
          status: 'cancelled',
          cancellationReason: 'Lluvia',
        }),
        booking(kiosk!, {
          unitId: unit(3),
          startsAt: at(5, 8),
          endsAt: at(6, 22),
          guestsCount: 25,
          status: 'pending',
          feeAmount: '100000.00',
        }),
      ],
      this.client
    )
  }

  private async communication(occupied: Unit[], myUnit: Unit) {
    const announcements = await Announcement.createMany(
      [
        {
          ...this.scope,
          title: 'Asamblea general ordinaria',
          body:
            'Convocamos a todos los propietarios a la asamblea general ordinaria el próximo sábado a ' +
            'las 9:00 a. m. en el salón social. Orden del día: informe de gestión, estados ' +
            'financieros, presupuesto y elección del consejo.',
          audience: 'owners',
          publishedAt: this.now.minus({ days: 2 }),
          isPinned: true,
          createdById: this.admin.id,
        },
        {
          ...this.scope,
          title: 'Mantenimiento de ascensores Torre 2',
          body:
            'El jueves entre 8:00 a. m. y 12:00 m. el ascensor de la Torre 2 estará fuera de ' +
            'servicio por mantenimiento preventivo. Disculpa las molestias.',
          audience: 'residents',
          publishedAt: this.now.minus({ days: 5 }),
          isPinned: false,
          createdById: this.admin.id,
        },
        {
          ...this.scope,
          title: 'Jornada de vacunación de mascotas',
          body:
            'Este domingo de 9:00 a. m. a 1:00 p. m. habrá jornada gratuita de vacunación ' +
            'antirrábica en la portería principal. Trae el carné de tu mascota.',
          audience: 'all',
          publishedAt: this.now.minus({ days: 9 }),
          isPinned: false,
          createdById: this.admin.id,
        },
        {
          ...this.scope,
          title: 'Recordatorio: pago de la cuota de administración',
          body:
            'La cuota de este mes vence el día 10. Puedes pagar por PSE o transferencia y ' +
            'reportar tu pago desde la app.',
          audience: 'all',
          publishedAt: this.now.minus({ days: 12 }),
          isPinned: false,
          createdById: this.admin.id,
        },
        {
          ...this.scope,
          title: 'Borrador: horarios de la piscina en vacaciones',
          body: 'Pendiente de aprobación del consejo.',
          audience: 'all',
          publishedAt: null,
          isPinned: false,
          createdById: this.admin.id,
        },
      ],
      this.client
    )
    await AnnouncementRead.createMany(
      [2, 3].map((i) => ({
        ...this.scope,
        announcementId: announcements[i]!.id,
        userId: this.resident.id,
        readAt: this.now.minus({ days: i * 2 }),
      })),
      this.client
    )

    const tickets: Array<Partial<Ticket> & { replies?: Array<[string, boolean]> }> = [
      {
        unitId: myUnit.id,
        createdById: this.resident.id,
        type: 'maintenance',
        subject: 'Filtración en el techo del baño',
        description:
          'Desde las lluvias del fin de semana hay una mancha de humedad que crece en el techo del baño principal.',
        priority: 'high',
        status: 'in_progress',
        assignedToId: this.admin.id,
        // High priority has 3 days: overdue in the bandeja
        createdAt: this.now.minus({ days: 5 }),
        replies: [
          ['Gracias por reportarlo. El jueves pasa el técnico a revisar la cubierta.', false],
          ['El apartamento de arriba también reporta humedad: revisar bajante.', true],
        ],
      },
      {
        unitId: occupied[3]!.id,
        createdById: this.admin.id,
        type: 'complaint',
        subject: 'Ruido en horas de la noche',
        description: 'Vecinos reportan música alta después de las 11 p. m. en el piso de arriba.',
        priority: 'medium',
        status: 'open',
      },
      {
        unitId: occupied[12]!.id,
        createdById: this.admin.id,
        type: 'petition',
        subject: 'Solicitud de paz y salvo',
        description: 'Necesito el paz y salvo de administración para la venta del apartamento.',
        priority: 'medium',
        status: 'resolved',
        resolvedAt: this.now.minus({ days: 3 }),
        replies: [['Paz y salvo enviado al correo registrado.', false]],
      },
      {
        unitId: null,
        createdById: this.admin.id,
        type: 'maintenance',
        subject: 'Luminaria dañada en el parqueadero',
        description: 'La luminaria junto al parqueadero P-12 no enciende.',
        priority: 'low',
        status: 'open',
        assignedToId: this.staff.id,
      },
      {
        unitId: occupied[20]!.id,
        createdById: this.admin.id,
        type: 'suggestion',
        subject: 'Bicicletero cubierto',
        description: 'Propongo instalar un bicicletero cubierto junto a la portería.',
        priority: 'low',
        status: 'closed',
        resolvedAt: this.now.minus({ days: 20 }),
        replies: [['Se llevará a la próxima reunión del consejo.', false]],
      },
      {
        unitId: occupied[27]!.id,
        createdById: this.admin.id,
        type: 'claim',
        subject: 'Cobro duplicado de cuota',
        description: 'En el estado de cuenta aparece dos veces la cuota del mes pasado.',
        priority: 'urgent',
        status: 'in_progress',
        assignedToId: this.admin.id,
      },
    ]
    for (const [i, { replies, ...ticket }] of tickets.entries()) {
      const created = await Ticket.create({ ...this.scope, number: i + 1, ...ticket }, this.client)
      if (replies) {
        await TicketComment.createMany(
          replies.map(([body, isInternal]) => ({
            ...this.scope,
            ticketId: created.id,
            authorId: this.admin.id,
            body,
            isInternal,
          })),
          this.client
        )
      }
    }
  }

  /**
   * Parking of the conjunto (mixed): the private spots of the structure, 16
   * communal spots for cars and 8 for motorcycles, assigned to units with
   * vehicles (one cancelled, one rejected, one from the previous period) and
   * SOAT dates, some expired. docs/parking.md
   */
  private async parkingSpots(occupied: Unit[], myUnit: Unit) {
    const parking: ParkingSettings = {
      mode: 'mixed',
      maxSpotsPerUnit: 2,
      rates: {
        car: { communal: 60_000, private: 0 },
        motorcycle: { communal: 25_000, private: 0 },
        bicycle: { communal: 0, private: 0 },
        other: { communal: 0, private: 0 },
      },
      lotteryMonths: 6,
      offerDays: 3,
      requirements: {
        noDebt: true,
        debtToleranceDays: 30,
        vehicle: true,
        documents: true,
        priorityWithoutPrivate: true,
      },
      allowThirdPartyVehicles: true,
    }
    this.tenant.settings = { ...(this.tenant.settings ?? {}), parking }
    await this.tenant.useTransaction(this.trx).save()

    // Documents of the vehicles; one is a leasing
    const vehicles = await Vehicle.query(this.client)
      .where('tenant_id', this.tenant.id)
      .whereIn('type', ['car', 'motorcycle'])
      .orderBy('plate')
    for (const [i, vehicle] of vehicles.entries()) {
      vehicle.soatExpiresOn = this.today.plus({ months: i % 7 === 0 ? -1 : 2 + (i % 10) })
      vehicle.inspectionExpiresOn = i % 3 === 0 ? null : this.today.plus({ months: 1 + (i % 11) })
      if (i === 4) {
        vehicle.merge({
          ownerType: 'third_party',
          ownerName: 'Banco de Bogotá Leasing',
          ownerDocumentType: 'NIT',
          ownerDocumentNumber: '860002964',
          ownerRelationship: 'leasing',
        })
      }
      await vehicle.useTransaction(this.trx).save()
    }

    // Private: one per parking unit of the structure
    const parkingUnits = await Unit.query(this.client)
      .where('tenant_id', this.tenant.id)
      .where('type', 'parking')
      .whereNotNull('parent_unit_id')
      .orderBy('code')
    await ParkingSpot.createMany(
      parkingUnits.map((unit, i) => ({
        ...this.scope,
        code: unit.code,
        vehicleType: 'car' as const,
        ownership: 'private' as const,
        isCovered: true,
        location: `Sótano 1 · Torre ${(i % TOWERS) + 1}`,
        ownerUnitId: unit.parentUnitId,
        propertyUnitId: unit.id,
      })),
      this.client
    )
    const communal = await ParkingSpot.createMany(
      [
        ...Array.from({ length: 16 }, (_, i) => ({
          ...this.scope,
          code: `C-${String(i + 1).padStart(2, '0')}`,
          vehicleType: 'car' as const,
          ownership: 'communal' as const,
          isCovered: i < 8,
          location: i < 8 ? 'Sótano 2' : 'Zona descubierta',
          isActive: i !== 15,
          notes: i === 15 ? 'Fuera de servicio por filtración.' : null,
        })),
        ...Array.from({ length: 8 }, (_, i) => ({
          ...this.scope,
          code: `M-${String(i + 1).padStart(2, '0')}`,
          vehicleType: 'motorcycle' as const,
          ownership: 'communal' as const,
          isCovered: true,
          location: 'Sótano 2',
        })),
      ],
      this.client
    )

    // Units without a private spot, with a vehicle of the type
    const owners = new Set(parkingUnits.map((unit) => unit.parentUnitId))
    // One spot per unit
    const taken = new Set<string>()
    const byType = (type: 'car' | 'motorcycle') =>
      vehicles.filter((vehicle) => {
        const ok =
          vehicle.type === type &&
          !owners.has(vehicle.unitId) &&
          !taken.has(vehicle.unitId) &&
          vehicle.unitId !== myUnit.id &&
          occupied.some((unit) => unit.id === vehicle.unitId)
        if (ok) taken.add(vehicle.unitId)
        return ok
      })
    const start = this.today.startOf('month').minus({ months: 2 })
    const end = start.plus({ months: parking.lotteryMonths }).minus({ days: 1 })
    const rows: Array<Partial<ParkingAssignment>> = []
    const assign = (spot: ParkingSpot, vehicle: Vehicle, extra: Partial<ParkingAssignment> = {}) =>
      rows.push({
        ...this.scope,
        spotId: spot.id,
        unitId: vehicle.unitId,
        vehicleId: vehicle.id,
        status: 'active',
        startsOn: start,
        endsOn: end,
        monthlyRate: parking.rates[spot.vehicleType].communal.toFixed(2),
        createdById: this.admin.id,
        ...extra,
      })
    const cars = byType('car')
    const carSpots = communal.filter((spot) => spot.vehicleType === 'car' && spot.isActive)
    for (const [i, spot] of carSpots.slice(0, 11).entries()) {
      const vehicle = cars[i]
      if (vehicle) assign(spot, vehicle)
    }
    const motos = byType('motorcycle')
    const motoSpots = communal.filter((spot) => spot.vehicleType === 'motorcycle')
    for (const [i, spot] of motoSpots.slice(0, 3).entries()) {
      const vehicle = motos[i]
      if (vehicle) assign(spot, vehicle)
    }
    // History: a cancelled one, a rejected one and the previous period
    const freeSpot = carSpots[12]
    const [a, b, c] = cars.slice(11)
    if (freeSpot && a) {
      assign(freeSpot, a, {
        status: 'cancelled',
        endedOn: this.today.minus({ days: 20 }),
        endReason: 'unused',
        endNote: 'El vehículo no ha entrado en dos meses.',
        endedById: this.admin.id,
        endedAt: this.now.minus({ days: 20 }),
      })
    }
    if (freeSpot && b) {
      assign(freeSpot, b, {
        status: 'rejected',
        startsOn: this.today.minus({ days: 10 }),
        endsOn: this.today.minus({ days: 10 }).plus({ months: 6 }),
        endedOn: this.today.minus({ days: 11 }),
        endReason: 'resident_resigned',
        endNote: 'La unidad vendió el carro.',
        endedById: this.admin.id,
        endedAt: this.now.minus({ days: 9 }),
      })
    }
    if (carSpots[0] && c) {
      assign(carSpots[0], c, {
        status: 'ended',
        startsOn: start.minus({ months: 6 }),
        endsOn: start.minus({ days: 1 }),
        endedOn: start.minus({ days: 1 }),
      })
    }
    await ParkingAssignment.createMany(rows, this.client)

    // Next period's lottery, open: current holders apply again and a few more.
    // The demo resident's unit has not applied, to try it in the portal.
    const lottery = await ParkingLottery.create(
      {
        ...this.scope,
        number: 1,
        title: `Sorteo de parqueaderos ${end.plus({ days: 1 }).setLocale('es-CO').toFormat('LLLL yyyy')}`,
        status: 'open',
        closesAt: this.now.plus({ days: 12 }).set({ hour: 18, minute: 0, second: 0 }),
        periodStartsOn: end.plus({ days: 1 }),
        periodEndsOn: end.plus({ months: parking.lotteryMonths }),
        notes:
          'Se sortean los cupos comunales del sótano 1 y de motos. Recuerda tener el SOAT y la tecnomecánica al día.',
        createdById: this.admin.id,
      },
      this.client
    )
    await this.trx.rawQuery(
      `INSERT INTO document_sequences (tenant_id, key, next_value) VALUES (?, 'parking_lottery', 2)`,
      [this.tenant.id]
    )
    const applicants = [...cars.slice(0, 11), ...cars.slice(14, 20), ...motos.slice(0, 4)]
    await ParkingApplication.createMany(
      applicants.map((vehicle) => ({
        ...this.scope,
        lotteryId: lottery.id,
        unitId: vehicle.unitId,
        vehicleId: vehicle.id,
        vehicleType: vehicle.type,
        status: 'pending' as const,
        priorityGroup: 0,
        appliedById: this.admin.id,
      })),
      this.client
    )
  }

  /**
   * Visitor parking: settings, a visit authorized from the portal waiting with
   * its car, vehicles inside (one past the maximum stay, one without a spot)
   * and some that already left without cost or exempt.
   */
  private async visitorParking(occupied: Unit[], myUnit: Unit) {
    const parking: VisitorParkingSettings = {
      enabled: true,
      vehicles: {
        car: { capacity: 4, hourlyRate: 3000, dailyCap: 24_000 },
        motorcycle: { capacity: 4, hourlyRate: 1500, dailyCap: 12_000 },
        bicycle: { capacity: 10, hourlyRate: 0, dailyCap: null },
        other: { capacity: 1, hourlyRate: 4000, dailyCap: null },
      },
      graceHours: 2,
      fractionMinutes: 30,
      vat: { enabled: false, rate: 19 },
      paymentMode: 'ask',
      cashAccountId: this.gateCashId,
      maxStayHours: 12,
    }
    this.tenant.settings = { ...(this.tenant.settings ?? {}), visitorParking: parking }
    await this.tenant.useTransaction(this.trx).save()

    await Visit.create(
      {
        ...this.scope,
        unitId: myUnit.id,
        visitorName: 'Mariana Ríos',
        visitorDocument: '1032456789',
        vehiclePlate: 'JKT482',
        type: 'guest',
        authorizedById: this.resident.id,
        accessCode: 'P4R8T2',
        expectedAt: this.now.plus({ hours: 1 }),
      },
      this.client
    )

    const tariff = (type: keyof VisitorParkingSettings['vehicles']) => ({
      hourlyRate: parking.vehicles[type].hourlyRate,
      dailyCap: parking.vehicles[type].dailyCap,
      graceMinutes: parking.graceHours * 60,
      fractionMinutes: parking.fractionMinutes,
      vatRate: 0,
    })
    const unit = (i: number) => occupied[(i * 7) % occupied.length]!.id
    const inside: Array<[keyof VisitorParkingSettings['vehicles'], string | null, number]> = [
      ['car', plate(80), 0.5],
      ['car', plate(81), 3],
      ['car', plate(82), 14],
      ['motorcycle', 'ABC12F', 1.5],
      ['bicycle', null, 4],
    ]
    for (const [i, [type, vehiclePlate, hours]] of inside.entries()) {
      const enteredAt = this.now.minus({ minutes: Math.round(hours * 60) })
      const visit = await Visit.create(
        {
          ...this.scope,
          unitId: i === 0 ? myUnit.id : unit(i),
          visitorName: personName(i + 60),
          vehiclePlate: normalizePlate(vehiclePlate),
          type: 'guest',
          checkedInAt: enteredAt,
          registeredById: this.guard.id,
        },
        this.client
      )
      await ParkingStay.create(
        {
          ...this.scope,
          status: 'inside',
          visitId: visit.id,
          unitId: visit.unitId,
          vehicleType: type,
          plate: normalizePlate(vehiclePlate),
          vehicleDescription: type === 'bicycle' ? 'Bicicleta roja, GW' : null,
          visitorName: personName(i + 60),
          authorizationMethod: i % 2 ? 'intercom' : 'call',
          authorizedByName: personName(i + 3),
          tariff: tariff(type),
          enteredAt,
          enteredById: this.guard.id,
        },
        this.client
      )
    }

    // Already left: within the grace (free) and exempt
    const left: Array<[number, number, 'free' | 'exempt']> = [
      [8, 1.5, 'free'],
      [6, 4, 'exempt'],
      [30, 1, 'free'],
    ]
    for (const [i, [hoursAgo, hours, settlement]] of left.entries()) {
      const enteredAt = this.now.minus({ hours: hoursAgo })
      const exitedAt = enteredAt.plus({ minutes: Math.round(hours * 60) })
      const priced = quoteParking(
        tariff('car'),
        splitByDay(enteredAt, exitedAt, this.tenant.timezone)
      )
      const days =
        settlement === 'exempt'
          ? priced.days.map((day) => ({ ...day, graceMinutes: 0, billedMinutes: 0, amount: 0 }))
          : priced.days
      const visit = await Visit.create(
        {
          ...this.scope,
          unitId: unit(i + 10),
          visitorName: personName(i + 70),
          vehiclePlate: plate(90 + i),
          type: 'guest',
          checkedInAt: enteredAt,
          checkedOutAt: exitedAt,
          registeredById: this.guard.id,
        },
        this.client
      )
      await ParkingStay.create(
        {
          ...this.scope,
          number: i + 1,
          status: 'exited',
          visitId: visit.id,
          unitId: visit.unitId,
          vehicleType: 'car',
          plate: plate(90 + i),
          visitorName: personName(i + 70),
          authorizationMethod: 'call',
          authorizedByName: personName(i + 12),
          tariff: tariff('car'),
          enteredAt,
          enteredById: this.guard.id,
          exitedAt,
          exitedById: this.guard.id,
          days,
          minutes: priced.minutes,
          graceMinutes: days.reduce((sum, day) => sum + day.graceMinutes, 0),
          billedMinutes: 0,
          amount: '0.00',
          vatAmount: '0.00',
          settlement,
          exemptReason: settlement === 'exempt' ? 'Técnico de la empresa de ascensores' : null,
        },
        this.client
      )
    }
    await this.trx.rawQuery(
      `INSERT INTO document_sequences (tenant_id, key, next_value) VALUES (?, 'visitor_parking', ?)`,
      [this.tenant.id, left.length + 1]
    )
  }

  private async security(occupied: Unit[], myUnit: Unit) {
    const hoursAgo = (h: number) => this.now.minus({ hours: h })
    const unit = (i: number) => occupied[i % occupied.length]!.id
    await Visit.createMany(
      [
        {
          ...this.scope,
          unitId: myUnit.id,
          visitorName: 'Andrea Gómez',
          visitorDocument: '1020304050',
          type: 'guest',
          authorizedById: this.resident.id,
          accessCode: 'K7Q2M9',
          expectedAt: this.now.plus({ days: 1 }).set({ hour: 19, minute: 0 }),
        },
        {
          ...this.scope,
          unitId: myUnit.id,
          visitorName: 'Técnico Claro',
          type: 'service_provider',
          authorizedById: this.resident.id,
          expectedAt: hoursAgo(26),
          checkedInAt: hoursAgo(25),
          checkedOutAt: hoursAgo(24),
          registeredById: this.admin.id,
        },
        ...Array.from({ length: 10 }, (_, i) => ({
          ...this.scope,
          unitId: unit(i * 5 + 2),
          visitorName: personName(i + 40),
          visitorDocument: String(80_000_000 + i * 4_321),
          vehiclePlate: i % 3 === 0 ? plate(i + 50) : null,
          type: i % 4 === 1 ? ('delivery' as const) : ('guest' as const),
          checkedInAt: hoursAgo(i * 5 + 1),
          checkedOutAt: i < 2 ? null : hoursAgo(i * 5 - 1),
          registeredById: this.admin.id,
        })),
      ],
      this.client
    )

    const carriers = [
      'Servientrega',
      'Coordinadora',
      'Mercado Libre',
      'Amazon',
      'Interrapidísimo',
      'Rappi',
    ]
    await Parcel.createMany(
      [
        {
          ...this.scope,
          unitId: myUnit.id,
          carrier: 'Mercado Libre',
          description: 'Caja mediana',
          receivedAt: hoursAgo(3),
          receivedById: this.admin.id,
          status: 'pending',
        },
        ...Array.from({ length: 9 }, (_, i) => ({
          ...this.scope,
          unitId: unit(i * 4 + 1),
          carrier: carriers[i % carriers.length],
          description: ['Sobre', 'Caja pequeña', 'Caja grande', 'Bolsa'][i % 4],
          receivedAt: hoursAgo(i * 9 + 2),
          receivedById: this.admin.id,
          deliveredAt: i % 3 === 0 ? null : hoursAgo(i * 9),
          deliveredToName: i % 3 === 0 ? null : personName(i * 3),
          status: i % 3 === 0 ? ('pending' as const) : ('delivered' as const),
        })),
      ],
      this.client
    )
  }

  /**
   * Document management: folders, every visibility, an expiring contract with
   * two versions, a deed only for the resident's unit and a draft.
   */
  private async documents(myUnit: Unit) {
    const folder = async (name: string, parentId: string | null = null) => {
      const created = await DocumentFolder.create({ ...this.scope, name, parentId }, this.client)
      return created.id
    }
    const assemblies = await folder('Asambleas')
    const thisYear = await folder(String(this.today.year), assemblies)
    const council = await folder('Consejo de administración')
    const contracts = await folder('Contratos y pólizas')
    const bylaws = await folder('Reglamentos')
    const finance = await folder('Estados financieros')
    const security = await Vendor.query({ client: this.trx })
      .where('tenant_id', this.tenant.id)
      .where('name', 'like', 'Vigilancia%')
      .first()

    type Seed = {
      title: string
      category: DocumentFile['category']
      visibility: DocumentFile['visibility']
      folderId: string | null
      reference?: string
      description?: string
      documentDate?: DateTime
      expiresOn?: DateTime
      vendorId?: string | null
      unitIds?: string[]
      draft?: boolean
      versions?: string[]
    }
    const year = this.today.year
    const seeds: Seed[] = [
      {
        title: 'Reglamento de propiedad horizontal',
        category: 'bylaws',
        visibility: 'community',
        folderId: bylaws,
        reference: 'Escritura 4.512',
        description: 'Reglamento protocolizado en la Notaría 21 de Bogotá.',
        documentDate: DateTime.fromISO('2016-03-10'),
      },
      {
        title: 'Manual de convivencia',
        category: 'bylaws',
        visibility: 'community',
        folderId: bylaws,
        description: 'Mascotas, ruido, uso de zonas comunes y sanciones.',
        documentDate: DateTime.fromISO(`${year - 1}-08-01`),
      },
      {
        title: `Acta asamblea general ordinaria ${year}`,
        category: 'minutes',
        visibility: 'owners',
        folderId: thisYear,
        reference: `Acta 01-${year}`,
        description: 'Aprobación de estados financieros, presupuesto y elección del consejo.',
        documentDate: DateTime.fromISO(`${year}-03-21`),
      },
      {
        title: `Estados financieros ${year - 1}`,
        category: 'financial_statement',
        visibility: 'owners',
        folderId: finance,
        description:
          'Balance general, estado de resultados y notas, con dictamen del revisor fiscal.',
        documentDate: DateTime.fromISO(`${year}-02-28`),
      },
      {
        title: `Presupuesto ${year}`,
        category: 'budget',
        visibility: 'owners',
        folderId: finance,
        documentDate: DateTime.fromISO(`${year}-03-21`),
      },
      {
        title: 'Acta reunión de consejo',
        category: 'minutes',
        visibility: 'council',
        folderId: council,
        reference: `Acta 07-${year}`,
        documentDate: this.today.minus({ days: 20 }),
      },
      {
        title: 'Contrato de vigilancia',
        category: 'contract',
        visibility: 'council',
        folderId: contracts,
        reference: `CV-${year - 1}-03`,
        description: 'Vigilancia 24 horas con dos guardas. Incluye otrosí de ajuste de tarifa.',
        documentDate: this.today.minus({ months: 11 }),
        expiresOn: this.today.plus({ days: 20 }),
        vendorId: security?.id ?? null,
        versions: ['Contrato firmado', 'Otrosi No. 1: ajuste de tarifa'],
      },
      {
        title: 'Póliza de áreas comunes',
        category: 'policy',
        visibility: 'council',
        folderId: contracts,
        reference: 'Póliza 1002-334455',
        documentDate: this.today.minus({ months: 7 }),
        expiresOn: this.today.plus({ months: 5 }),
      },
      {
        title: 'Cotización mantenimiento de fachada',
        category: 'quote',
        visibility: 'council',
        folderId: contracts,
        description: 'Lavado e impermeabilización de las tres torres.',
        documentDate: this.today.minus({ days: 9 }),
        expiresOn: this.today.plus({ days: 50 }),
      },
      {
        title: 'Manual del sistema de bombas',
        category: 'plan',
        visibility: 'staff',
        folderId: null,
        description: 'Operación y mantenimiento del equipo de presión.',
      },
      {
        title: `Certificado de tradición y libertad · ${myUnit.code}`,
        category: 'deed',
        visibility: 'units',
        folderId: null,
        documentDate: this.today.minus({ days: 40 }),
        unitIds: [myUnit.id],
      },
      {
        title: 'Propuesta de reforma al reglamento',
        category: 'bylaws',
        visibility: 'private',
        folderId: bylaws,
        description: 'Borrador para revisar con el abogado antes de llevarlo al consejo.',
        draft: true,
      },
    ]

    for (const [index, seed] of seeds.entries()) {
      const createdAt = this.now.minus({ days: seeds.length - index })
      const document = await DocumentFile.create(
        {
          ...this.scope,
          title: seed.title,
          category: seed.category,
          visibility: seed.visibility,
          folderId: seed.folderId,
          reference: seed.reference ?? null,
          description: seed.description ?? null,
          documentDate: seed.documentDate ?? null,
          expiresOn: seed.expiresOn ?? null,
          vendorId: seed.vendorId ?? null,
          publishedAt: seed.draft ? null : createdAt,
          uploadedById: this.admin.id,
          updatedById: this.admin.id,
          createdAt,
        },
        this.client
      )
      if (seed.unitIds?.length) {
        await this.trx.table('document_units').multiInsert(
          seed.unitIds.map((unitId) => ({
            tenant_id: this.tenant.id,
            document_id: document.id,
            unit_id: unitId,
          }))
        )
      }
      for (const [v, label] of (seed.versions ?? [seed.title]).entries()) {
        const slug = seed.title
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        const body = demoPdf(seed.title, [
          label,
          seed.reference ? `Referencia: ${seed.reference}` : '',
          'Documento de ejemplo del conjunto demo de AptoPH.',
        ])
        const key = `${DEMO_SLUG}/documentos/${createdAt.toFormat('yyyy/MM')}/${document.id}-v${v + 1}-${slug}.pdf`
        this.files.push({ key, body })
        await Attachment.create(
          {
            ...this.scope,
            ownerType: 'document',
            ownerId: document.id,
            fileKey: key,
            fileName: `${slug}${v ? `-v${v + 1}` : ''}.pdf`,
            mimeType: 'application/pdf',
            sizeBytes: body.length,
            uploadedById: this.admin.id,
            createdAt: createdAt.plus({ hours: v }),
          },
          this.client
        )
      }
    }
  }

  /**
   * Surveys: one open (the resident's unit has not voted yet), one closed with
   * its results in the history and a draft.
   */
  private async surveys(apartments: Unit[], myUnit: Unit) {
    type Seed = {
      title: string
      description: string
      opensAt: DateTime | null
      closesAt: DateTime
      anonymous: boolean
      resultsVisibility: 'after_vote' | 'after_close'
      minParticipation: number | null
      questions: Array<{ text: string; options: string[]; weights: number[] }>
      /** Share of the apartments that voted */
      turnout: number
    }
    const seeds: Seed[] = [
      {
        title: 'Remodelación del salón social',
        description:
          'La administración recibió tres propuestas para remodelar el salón social. Antes de llevar el tema a la asamblea queremos conocer tu opinión.',
        opensAt: this.now.minus({ days: 3 }),
        closesAt: this.now.plus({ days: 6 }).set({ hour: 18, minute: 0 }),
        anonymous: true,
        resultsVisibility: 'after_vote',
        minParticipation: 51,
        questions: [
          {
            text: '¿Está de acuerdo con remodelar el salón social este año?',
            options: ['Sí', 'No', 'Me abstengo'],
            weights: [6, 3, 1],
          },
          {
            text: '¿Cómo prefiere financiarla?',
            options: [
              'Cuota extraordinaria en 3 meses',
              'Fondo de imprevistos',
              'Esperar al próximo presupuesto',
            ],
            weights: [3, 5, 2],
          },
        ],
        turnout: 0.4,
      },
      {
        title: 'Horario de la piscina',
        description:
          'Propuesta del consejo para ampliar el horario de la piscina los fines de semana.',
        opensAt: this.now.minus({ days: 40 }),
        closesAt: this.now.minus({ days: 25 }),
        anonymous: false,
        resultsVisibility: 'after_close',
        minParticipation: 30,
        questions: [
          {
            text: '¿Amplía el horario hasta las 9:00 p. m. los sábados y domingos?',
            options: ['Sí', 'No'],
            weights: [7, 3],
          },
          {
            text: '¿Prefiere un turno exclusivo para adultos?',
            options: ['Sí, de 7:00 a 9:00 a. m.', 'No es necesario'],
            weights: [4, 6],
          },
        ],
        turnout: 0.65,
      },
      {
        title: 'Cambio de empresa de vigilancia',
        description: 'Borrador: se publicará cuando lleguen las tres cotizaciones.',
        opensAt: null,
        closesAt: this.now.plus({ days: 20 }),
        anonymous: true,
        resultsVisibility: 'after_close',
        minParticipation: 51,
        questions: [
          {
            text: '¿Está de acuerdo con cambiar la empresa de vigilancia?',
            options: ['Sí', 'No', 'Me abstengo'],
            weights: [0, 0, 0],
          },
        ],
        turnout: 0,
      },
    ]

    const voters = apartments.filter(
      (unit) => unit.id !== myUnit.id && Number(unit.ownershipCoefficient) > 0
    )
    for (const seed of seeds) {
      const survey = await Survey.create(
        {
          ...this.scope,
          title: seed.title,
          description: seed.description,
          opensAt: seed.opensAt,
          publishedAt: seed.opensAt,
          closesAt: seed.closesAt,
          anonymous: seed.anonymous,
          resultsVisibility: seed.resultsVisibility,
          minParticipation: seed.minParticipation === null ? null : String(seed.minParticipation),
          createdById: this.admin.id,
          updatedById: this.admin.id,
        },
        this.client
      )
      const questions = []
      for (const [index, question] of seed.questions.entries()) {
        const created = await SurveyQuestion.create(
          { ...this.scope, surveyId: survey.id, position: index + 1, text: question.text },
          this.client
        )
        const options = await SurveyOption.createMany(
          question.options.map((label, position) => ({
            ...this.scope,
            questionId: created.id,
            position: position + 1,
            label,
          })),
          this.client
        )
        questions.push({ id: created.id, options, weights: question.weights })
      }

      const count = Math.round(voters.length * seed.turnout)
      for (const [n, unit] of voters.slice(0, count).entries()) {
        const [response] = await this.trx
          .table('survey_responses')
          .insert({
            tenant_id: this.tenant.id,
            survey_id: survey.id,
            unit_id: unit.id,
            user_id: null,
            coefficient: unit.ownershipCoefficient,
            created_at: (seed.opensAt ?? this.now).plus({ hours: 2 + n * 3 }).toISO(),
          })
          .returning('id')
        for (const question of questions) {
          // A deterministic pick that follows the weights
          const total = question.weights.reduce((sum, w) => sum + w, 0)
          let point = (n * 7 + question.options.length) % total
          let pick = 0
          while (point >= question.weights[pick]) point -= question.weights[pick++]
          const option = question.options[pick]
          if (!seed.anonymous) {
            await this.trx.table('survey_answers').insert({
              tenant_id: this.tenant.id,
              response_id: response.id,
              question_id: question.id,
              option_id: option.id,
            })
          }
          await this.trx.rawQuery(
            `INSERT INTO survey_tallies (tenant_id, survey_id, question_id, option_id, votes, coefficient)
             VALUES (?, ?, ?, ?, 1, ?)
             ON CONFLICT (survey_id, option_id)
             DO UPDATE SET votes = survey_tallies.votes + 1, coefficient = survey_tallies.coefficient + EXCLUDED.coefficient`,
            [this.tenant.id, survey.id, question.id, option.id, unit.ownershipCoefficient]
          )
        }
      }
    }
  }

  private async audit(myUnit: Unit) {
    await AuditLog.createMany(
      [
        {
          action: 'created',
          auditableType: 'announcement',
          changes: { title: 'Asamblea general ordinaria' },
        },
        {
          action: 'updated',
          auditableType: 'unit',
          auditableId: myUnit.id,
          changes: { status: ['vacant', 'occupied'] },
        },
        { action: 'confirmed', auditableType: 'payment', changes: { amount: '450000.00' } },
      ].map((entry) => ({ ...entry, tenantId: this.tenant.id, userId: this.admin.id })),
      this.client
    )
  }
}
