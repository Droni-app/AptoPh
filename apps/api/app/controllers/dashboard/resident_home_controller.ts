import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import UnitOccupant from '#models/property/unit_occupant'
import { activeOccupancy, balancesFor, tenantToday } from '#services/resident_scope'

/**
 * GET /api/v1/resident/home — the resident's overview of their community:
 * the conjunto, its size, and the units they live in or own with their balance.
 */
export default class HomeController {
  async show({ tenant, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const today = tenantToday(tenant)

    const occupancies = await UnitOccupant.query()
      .where('tenant_id', tenant.id)
      .where('user_id', user.id)
      .where(activeOccupancy(today))
      .preload('unit', (query) => query.whereNull('deleted_at').preload('building'))

    // A soft-deleted unit is not preloaded
    const mine = occupancies
      .filter((occupancy) => occupancy.unit)
      .sort((a, b) => {
        const byBuilding =
          (a.unit.building?.sortOrder ?? Infinity) - (b.unit.building?.sortOrder ?? Infinity)
        return byBuilding || a.unit.code.localeCompare(b.unit.code, 'es', { numeric: true })
      })

    const [balances, [buildings], [units]] = await Promise.all([
      balancesFor(
        tenant,
        mine.map((occupancy) => occupancy.unitId),
        today
      ),
      db.from('buildings').where('tenant_id', tenant.id).count('* as total'),
      db.from('units').where('tenant_id', tenant.id).whereNull('deleted_at').count('* as total'),
    ])

    return {
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          legalName: tenant.legalName,
          address: tenant.address,
          city: tenant.city,
          currency: tenant.currency,
          buildingsCount: Number(buildings.total),
          unitsCount: Number(units.total),
        },
        units: mine.map(({ unit, relationship, isPrimaryContact, isBillingResponsible }) => ({
          id: unit.id,
          code: unit.code,
          type: unit.type,
          floor: unit.floor,
          privateArea: unit.privateArea,
          ownershipCoefficient: unit.ownershipCoefficient,
          building: unit.building ? { id: unit.building.id, name: unit.building.name } : null,
          relationship,
          isPrimaryContact,
          isBillingResponsible,
          balance: balances.get(unit.id)!,
        })),
      },
    }
  }
}
