import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import Tenant from '#models/tenant'
import User from '#models/user'
import Enrollment from '#models/enrollment'
import Building from '#models/building'
import Unit from '#models/unit'
import UnitOccupant from '#models/unit_occupant'
import Vehicle from '#models/vehicle'
import Pet from '#models/pet'
import ChargeConcept from '#models/charge_concept'
import Charge from '#models/charge'
import Payment from '#models/payment'
import PaymentAllocation from '#models/payment_allocation'
import Amenity from '#models/amenity'
import AmenityBooking from '#models/amenity_booking'
import Announcement from '#models/announcement'
import AnnouncementRead from '#models/announcement_read'
import Ticket from '#models/ticket'
import TicketComment from '#models/ticket_comment'
import Visit from '#models/visit'
import Parcel from '#models/parcel'
import DocumentFile from '#models/document'
import AuditLog from '#models/audit_log'

/**
 * PUBLIC DEMO: "Altos del Parque (Demo)", a small conjunto with records in every
 * module, and two users whose credentials are published on the landing page:
 *
 *   admin@demo.test      → backoffice (administrator)
 *   residente@demo.test  → resident web app (owner of Torre 1 · 302)
 *
 * Runs on every deploy (pre-deploy job) and in development. Each run wipes the demo
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
/** Monthly budget split by ownership coefficient (COP) */
const MONTHLY_BUDGET = 28_800_000

/** Tables with demo data, children first (all have tenant_id) */
const TENANT_TABLES = [
  'audit_logs',
  'announcement_reads',
  'announcements',
  'ticket_comments',
  'tickets',
  'payment_allocations',
  'payments',
  'amenity_bookings',
  'amenities',
  'charges',
  'charge_concepts',
  'visits',
  'parcels',
  'documents',
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
  static environment = ['production', 'development']

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

    await db.transaction(async (trx) => {
      // The demo users only exist in the demo conjunto
      await trx
        .from('enrollments')
        .whereIn('user_id', [admin.id, resident.id])
        .whereNot('tenant_id', tenant.id)
        .delete()
      await trx.from('enrollments').where('tenant_id', tenant.id).delete()
      await Enrollment.createMany(
        [
          { tenantId: tenant.id, userId: admin.id, role: 'administrator', status: 'active' },
          { tenantId: tenant.id, userId: resident.id, role: 'resident', status: 'active' },
        ],
        { client: trx }
      )

      await this.wipe(trx, tenant.id)
      await new DemoBuilder(trx, tenant, admin, resident).build()
    })
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

class DemoBuilder {
  private client: { client: TransactionClientContract }
  private now: DateTime
  private today: DateTime

  constructor(
    trx: TransactionClientContract,
    private tenant: Tenant,
    private admin: User,
    private resident: User
  ) {
    this.client = { client: trx }
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
    await this.documents()
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
   * Three months of administration fees for every apartment, payments with their
   * allocations, and a few extra charges. Most units are up to date; some owe the
   * current month, a few are overdue.
   */
  private async finance(apartments: Unit[], occupied: Unit[], myUnit: Unit) {
    const [fee, extraordinary, fine, service] = await ChargeConcept.createMany(
      [
        {
          ...this.scope,
          name: 'Cuota de administración',
          type: 'ordinary_fee' as const,
          calculation: 'by_coefficient' as const,
          isActive: true,
        },
        {
          ...this.scope,
          name: 'Cuota extraordinaria fachada',
          type: 'extraordinary_fee' as const,
          calculation: 'by_coefficient' as const,
          isActive: true,
        },
        {
          ...this.scope,
          name: 'Multa por ruido',
          type: 'fine' as const,
          calculation: 'fixed' as const,
          defaultAmount: '150000.00',
          isActive: true,
        },
        {
          ...this.scope,
          name: 'Alquiler salón social',
          type: 'service' as const,
          calculation: 'fixed' as const,
          defaultAmount: '80000.00',
          isActive: true,
        },
      ],
      this.client
    )

    const thisMonth = this.today.startOf('month')
    const months = [thisMonth.minus({ months: 2 }), thisMonth.minus({ months: 1 }), thisMonth]
    const dueOn = (period: DateTime, current: boolean) =>
      current ? this.today.plus({ days: 10 }) : period.set({ day: 10 })

    type Plan = 'paid' | 'partial' | 'pending'
    /** What happened with each month: [two months ago, last month, this month] */
    const planFor = (unit: Unit, i: number): Plan[] => {
      if (unit.id === myUnit.id) return ['paid', 'partial', 'pending']
      if (unit.status === 'vacant') return ['pending', 'pending', 'pending']
      if (i % 7 === 3) return ['paid', 'pending', 'pending']
      if (i % 5 === 1) return ['paid', 'paid', 'pending']
      return ['paid', 'paid', 'paid']
    }

    const chargeRows: Array<Partial<Charge>> = []
    const plans: Plan[] = []
    apartments.forEach((unit, i) => {
      const amount = Math.round((Number(unit.ownershipCoefficient) * MONTHLY_BUDGET) / 100) * 100
      planFor(unit, i).forEach((plan, m) => {
        const period = months[m]!
        const balance = plan === 'paid' ? 0 : plan === 'partial' ? Math.round(amount * 0.4) : amount
        plans.push(plan)
        chargeRows.push({
          ...this.scope,
          unitId: unit.id,
          chargeConceptId: fee!.id,
          period,
          description: null,
          amount: money(amount),
          balance: money(balance),
          dueOn: dueOn(period, m === 2),
          status: plan === 'paid' ? 'paid' : plan === 'partial' ? 'partially_paid' : 'pending',
          createdById: this.admin.id,
        })
      })
      // Second installment of the façade works, last month
      if (i % 2 === 0) {
        const installment = Math.round((Number(unit.ownershipCoefficient) * 9_000_000) / 100) * 100
        const paid = unit.id !== myUnit.id && i % 3 !== 0
        plans.push(paid ? 'paid' : 'pending')
        chargeRows.push({
          ...this.scope,
          unitId: unit.id,
          chargeConceptId: extraordinary!.id,
          period: months[1]!,
          description: 'Cuota 2 de 4 · pintura e impermeabilización de fachada',
          amount: money(installment),
          balance: money(paid ? 0 : installment),
          dueOn: months[1]!.set({ day: 25 }),
          status: paid ? 'paid' : 'pending',
          createdById: this.admin.id,
        })
      }
    })
    const noisy = occupied[9]!
    plans.push('pending')
    chargeRows.push({
      ...this.scope,
      unitId: noisy.id,
      chargeConceptId: fine!.id,
      period: months[1]!,
      description: 'Ruido después de las 10 p. m. (reincidencia)',
      amount: '150000.00',
      balance: '150000.00',
      dueOn: months[1]!.set({ day: 20 }),
      status: 'pending',
      createdById: this.admin.id,
    })

    const charges = await Charge.createMany(chargeRows, this.client)

    // One payment per (partly) paid charge, with its allocation
    const methods = ['pse', 'bank_transfer', 'pse', 'card', 'cash'] as const
    const paidCharges = charges
      .map((charge, i) => ({ charge, plan: plans[i]! }))
      .filter(({ plan }) => plan !== 'pending')
    const payments = await Payment.createMany(
      paidCharges.map(({ charge }, i) => {
        const amount = Number(charge.amount) - Number(charge.balance)
        const paidAt = charge.dueOn.minus({ days: 1 + (i % 8) }).set({ hour: 9 + (i % 10) })
        return {
          ...this.scope,
          unitId: charge.unitId,
          amount: money(amount),
          paidAt: paidAt > this.now ? this.now.minus({ hours: 2 }) : paidAt,
          method: methods[i % methods.length]!,
          reference: `PAY-${paidAt.toFormat('yyMM')}-${String(1000 + i)}`,
          status: 'confirmed',
          registeredById: this.admin.id,
          confirmedById: this.admin.id,
        }
      }),
      this.client
    )
    await PaymentAllocation.createMany(
      payments.map((payment, i) => ({
        ...this.scope,
        paymentId: payment.id,
        chargeId: paidCharges[i]!.charge.id,
        amount: payment.amount,
      })),
      this.client
    )

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
      },
      this.client
    )

    this.serviceConceptId = service!.id
  }

  private serviceConceptId = ''

  private async amenities(occupied: Unit[], myUnit: Unit) {
    const [salon, bbq, gym, pool] = await Amenity.createMany(
      [
        {
          ...this.scope,
          name: 'Salón social',
          description: 'Salón para 60 personas con cocineta y baños.',
          capacity: 60,
          bookingFee: '80000.00',
          requiresApproval: true,
          rules: { maxHours: 6, closesAt: '23:00', depositRequired: true },
          isActive: true,
        },
        {
          ...this.scope,
          name: 'Zona BBQ',
          description: 'Asador a gas, mesas y pérgola junto al parque infantil.',
          capacity: 20,
          bookingFee: '30000.00',
          requiresApproval: true,
          rules: { maxHours: 4, closesAt: '21:00' },
          isActive: true,
        },
        {
          ...this.scope,
          name: 'Gimnasio',
          description: 'Máquinas cardiovasculares y zona de pesas.',
          capacity: 8,
          bookingFee: null,
          requiresApproval: false,
          rules: { maxHours: 1, opensAt: '05:00', closesAt: '22:00' },
          isActive: true,
        },
        {
          ...this.scope,
          name: 'Piscina',
          description: 'Piscina climatizada. Cerrada los lunes por mantenimiento.',
          capacity: 25,
          bookingFee: null,
          requiresApproval: false,
          rules: { maxHours: 2, closedOn: ['monday'] },
          isActive: true,
        },
      ],
      this.client
    )

    const at = (days: number, hour: number) =>
      this.today.plus({ days }).set({ hour, minute: 0, second: 0, millisecond: 0 })

    const salonCharge = await Charge.create(
      {
        ...this.scope,
        unitId: myUnit.id,
        chargeConceptId: this.serviceConceptId,
        period: this.today.startOf('month'),
        description: 'Reserva del salón social',
        amount: '80000.00',
        balance: '80000.00',
        dueOn: at(5, 0),
        status: 'pending',
        createdById: this.admin.id,
      },
      this.client
    )

    const unit = (i: number) => occupied[i % occupied.length]!.id
    await AmenityBooking.createMany(
      [
        {
          ...this.scope,
          amenityId: salon!.id,
          unitId: myUnit.id,
          requestedById: this.resident.id,
          startsAt: at(6, 15),
          endsAt: at(6, 21),
          guestsCount: 40,
          status: 'approved',
          chargeId: salonCharge.id,
          reviewedById: this.admin.id,
        },
        {
          ...this.scope,
          amenityId: bbq!.id,
          unitId: unit(5),
          requestedById: this.admin.id,
          startsAt: at(2, 12),
          endsAt: at(2, 16),
          guestsCount: 12,
          status: 'pending',
        },
        {
          ...this.scope,
          amenityId: bbq!.id,
          unitId: unit(14),
          requestedById: this.admin.id,
          startsAt: at(9, 13),
          endsAt: at(9, 17),
          guestsCount: 18,
          status: 'pending',
        },
        {
          ...this.scope,
          amenityId: salon!.id,
          unitId: unit(21),
          requestedById: this.admin.id,
          startsAt: at(-4, 18),
          endsAt: at(-4, 23),
          guestsCount: 50,
          status: 'approved',
          reviewedById: this.admin.id,
        },
        {
          ...this.scope,
          amenityId: salon!.id,
          unitId: unit(30),
          requestedById: this.admin.id,
          startsAt: at(6, 10),
          endsAt: at(6, 14),
          guestsCount: 30,
          status: 'rejected',
          reviewedById: this.admin.id,
        },
        {
          ...this.scope,
          amenityId: gym!.id,
          unitId: myUnit.id,
          requestedById: this.resident.id,
          startsAt: at(1, 6),
          endsAt: at(1, 7),
          guestsCount: 1,
          status: 'approved',
        },
        {
          ...this.scope,
          amenityId: pool!.id,
          unitId: unit(8),
          requestedById: this.admin.id,
          startsAt: at(3, 10),
          endsAt: at(3, 12),
          guestsCount: 4,
          status: 'cancelled',
        },
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

  /** Document records only: the demo has no files in storage */
  private async documents() {
    const docs: Array<[string, DocumentFile['category'], DocumentFile['visibility']]> = [
      ['Reglamento de propiedad horizontal', 'bylaws', 'public'],
      ['Manual de convivencia', 'policy', 'public'],
      ['Acta asamblea ordinaria', 'minutes', 'public'],
      ['Estados financieros del año anterior', 'financial_statement', 'public'],
      ['Contrato de vigilancia', 'contract', 'council'],
      ['Acta reunión de consejo', 'minutes', 'council'],
    ]
    await DocumentFile.createMany(
      docs.map(([title, category, visibility], i) => ({
        ...this.scope,
        title,
        category,
        visibility,
        fileKey: `demo/documents/${i + 1}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 180_000 + i * 52_000,
        uploadedById: this.admin.id,
      })),
      this.client
    )
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
