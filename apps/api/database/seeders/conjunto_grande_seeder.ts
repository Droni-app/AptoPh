import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'
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
import { DateTime } from 'luxon'

/**
 * LOCAL TEST DATA ONLY: "Conjunto Grande", 5 towers x 20 floors x 8 apartments = 800 units,
 * plus an administrator and a resident to log in with.
 *
 *   node ace db:seed --files database/seeders/conjunto_grande_seeder.ts
 *
 * Idempotent: running it again updates the same rows instead of duplicating them.
 */

const TOWERS = 5
const FLOORS = 20
/** Private area (m²) of apartments 01..08 on every floor: corner units are larger */
const AREAS_BY_POSITION = [82.4, 64.1, 64.1, 71.3, 71.3, 64.1, 64.1, 82.4]
const UNITS_PER_FLOOR = AREAS_BY_POSITION.length

export const CONJUNTO_GRANDE_PASSWORD = 'password123'

/** Unit code: floor + 2-digit position, e.g. floor 1 → 101..108, floor 20 → 2001..2008 */
function unitCode(floor: number, position: number) {
  return `${floor}${String(position).padStart(2, '0')}`
}

/**
 * Ownership coefficients proportional to private area, rounded to 6 decimals.
 * The rounding remainder goes to the last unit so the total is exactly 1.
 */
function coefficients() {
  const areaPerFloor = AREAS_BY_POSITION.reduce((sum, area) => sum + area, 0)
  const totalArea = areaPerFloor * FLOORS * TOWERS
  const micro = AREAS_BY_POSITION.map((area) => Math.round((area / totalArea) * 1e6))
  const assigned = micro.reduce((sum, value) => sum + value, 0) * FLOORS * TOWERS
  return { micro, remainder: 1e6 - assigned }
}

export default class extends BaseSeeder {
  static environment = ['development']

  async run() {
    const tenant = await Tenant.updateOrCreate(
      { slug: 'conjunto-grande' },
      {
        name: 'Conjunto Grande',
        legalName: 'Conjunto Residencial Grande P.H.',
        propertyType: 'residential',
        city: 'Bogotá',
        countryCode: 'CO',
        status: 'active',
      }
    )

    const admin = await User.updateOrCreate(
      { email: 'admin@conjuntogrande.test' },
      { fullName: 'Andrea Administradora', password: CONJUNTO_GRANDE_PASSWORD }
    )
    const resident = await User.updateOrCreate(
      { email: 'residente@conjuntogrande.test' },
      { fullName: 'Ricardo Residente', password: CONJUNTO_GRANDE_PASSWORD }
    )

    await Enrollment.updateOrCreateMany(
      ['tenantId', 'userId', 'role'],
      [
        { tenantId: tenant.id, userId: admin.id, role: 'administrator', status: 'active' },
        { tenantId: tenant.id, userId: resident.id, role: 'resident', status: 'active' },
      ]
    )

    const { micro, remainder } = coefficients()

    await db.transaction(async (trx) => {
      for (let tower = 1; tower <= TOWERS; tower++) {
        const building = await Building.updateOrCreate(
          { tenantId: tenant.id, name: `Torre ${tower}` },
          { floors: FLOORS, sortOrder: tower - 1 },
          { client: trx }
        )

        const units = []
        for (let floor = 1; floor <= FLOORS; floor++) {
          for (let position = 1; position <= UNITS_PER_FLOOR; position++) {
            const isLastUnit = tower === TOWERS && floor === FLOORS && position === UNITS_PER_FLOOR
            const coefficient = micro[position - 1]! + (isLastUnit ? remainder : 0)
            units.push({
              tenantId: tenant.id,
              buildingId: building.id,
              code: unitCode(floor, position),
              type: 'apartment' as const,
              floor,
              privateArea: AREAS_BY_POSITION[position - 1]!.toFixed(2),
              ownershipCoefficient: (coefficient / 1e6).toFixed(6),
              // Deterministic ~10% vacancy, so lists and filters have some variety
              status: (floor + position) % 10 === 0 ? ('vacant' as const) : ('occupied' as const),
            })
          }
        }

        await Unit.updateOrCreateMany(['tenantId', 'buildingId', 'code'], units, { client: trx })
      }
    })

    // The test resident owns Torre 1 · 101
    const tower1 = await Building.query()
      .where('tenant_id', tenant.id)
      .where('name', 'Torre 1')
      .firstOrFail()
    const unit101 = await Unit.query()
      .where('tenant_id', tenant.id)
      .where('building_id', tower1.id)
      .where('code', '101')
      .firstOrFail()

    await UnitOccupant.updateOrCreate(
      { tenantId: tenant.id, unitId: unit101.id, userId: resident.id },
      {
        fullName: resident.fullName,
        email: resident.email,
        relationship: 'owner',
        isPrimaryContact: true,
        isBillingResponsible: true,
      }
    )

    await this.seedResidentHome(tenant, unit101.id)
  }

  /**
   * Household, vehicles, pets and an account statement for Torre 1 · 101, so the
   * resident app has something to show: last month partly paid and overdue,
   * this month pending.
   */
  private async seedResidentHome(tenant: Tenant, unitId: string) {
    const scope = { tenantId: tenant.id, unitId }

    await UnitOccupant.updateOrCreate(
      { ...scope, fullName: 'Laura Martínez' },
      { relationship: 'family_member', isPrimaryContact: false, isBillingResponsible: false }
    )

    await Vehicle.updateOrCreate(
      { tenantId: tenant.id, plate: 'FRS123' },
      { unitId, type: 'car', brand: 'Mazda', model: '3', color: 'Gris' }
    )
    await Vehicle.updateOrCreate(
      { tenantId: tenant.id, plate: 'ABC12D' },
      { unitId, type: 'motorcycle', brand: 'Yamaha', model: 'NMAX', color: 'Negro' }
    )
    await Pet.updateOrCreate(
      { ...scope, name: 'Luna' },
      { species: 'dog', breed: 'Golden retriever' }
    )

    const concept = await ChargeConcept.updateOrCreate(
      { tenantId: tenant.id, name: 'Cuota de administración' },
      { type: 'ordinary_fee', calculation: 'by_coefficient', isActive: true }
    )

    const today = DateTime.now().setZone(tenant.timezone).startOf('day')
    const thisMonth = today.startOf('month')
    const lastMonth = thisMonth.minus({ months: 1 })
    const charges = [
      {
        period: lastMonth,
        balance: '120000.00',
        status: 'partially_paid' as const,
        dueOn: lastMonth.set({ day: 10 }),
      },
      // Always due in the future, whatever day the seeder runs
      {
        period: thisMonth,
        balance: '385000.00',
        status: 'pending' as const,
        dueOn: today.plus({ days: 10 }),
      },
    ]
    for (const { period, ...values } of charges) {
      await Charge.updateOrCreate(
        { ...scope, chargeConceptId: concept.id, period },
        { amount: '385000.00', ...values }
      )
    }
  }
}
