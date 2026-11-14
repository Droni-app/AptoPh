import type { HttpContext } from '@adonisjs/core/http'
import UnitOccupant from '#models/unit_occupant'
import { activeOccupancy, balancesFor, tenantToday } from '#services/resident_scope'

/**
 * GET /api/v1/resident/units/:id — one of the resident's own units.
 * Any other unit answers 404, so residents cannot probe their neighbours.
 */
export default class UnitsController {
  async show({ tenant, auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const today = tenantToday(tenant)

    const occupancy = await UnitOccupant.query()
      .where('tenant_id', tenant.id)
      .where('user_id', user.id)
      .where('unit_id', params.id)
      .where(activeOccupancy(today))
      .preload('unit', (query) =>
        query
          .whereNull('deleted_at')
          .preload('building')
          .preload('occupants', (occupants) =>
            occupants
              .where(activeOccupancy(today))
              .orderBy('is_primary_contact', 'desc')
              .orderBy('full_name')
          )
          .preload('vehicles', (vehicles) => vehicles.whereNull('deleted_at').orderBy('plate'))
          .preload('pets', (pets) => pets.whereNull('deleted_at').orderBy('name'))
          .preload('charges', (charges) =>
            charges
              .whereIn('status', ['pending', 'partially_paid'])
              .preload('chargeConcept')
              .orderBy('due_on')
          )
      )
      .first()

    if (!occupancy?.unit) {
      return response.notFound({ errors: [{ message: 'La unidad no existe' }] })
    }

    const unit = occupancy.unit
    const balances = await balancesFor(tenant, [unit.id], today)

    return {
      data: {
        id: unit.id,
        code: unit.code,
        type: unit.type,
        floor: unit.floor,
        status: unit.status,
        privateArea: unit.privateArea,
        ownershipCoefficient: unit.ownershipCoefficient,
        building: unit.building ? { id: unit.building.id, name: unit.building.name } : null,
        relationship: occupancy.relationship,
        isPrimaryContact: occupancy.isPrimaryContact,
        isBillingResponsible: occupancy.isBillingResponsible,
        balance: balances.get(unit.id)!,
        // Co-residents see each other's name and role in the unit, never documents or contacts
        household: unit.occupants.map((member) => ({
          id: member.id,
          fullName: member.fullName,
          relationship: member.relationship,
          isPrimaryContact: member.isPrimaryContact,
          isBillingResponsible: member.isBillingResponsible,
          isMe: member.userId === user.id,
        })),
        vehicles: unit.vehicles.map((vehicle) => ({
          id: vehicle.id,
          plate: vehicle.plate,
          type: vehicle.type,
          brand: vehicle.brand,
          model: vehicle.model,
          color: vehicle.color,
        })),
        pets: unit.pets.map((pet) => ({
          id: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
        })),
        openCharges: unit.charges.map((charge) => {
          const dueOn = charge.dueOn.toISODate()!
          return {
            id: charge.id,
            concept: charge.chargeConcept.name,
            description: charge.description,
            period: charge.period.toISODate(),
            amount: charge.amount,
            balance: charge.balance,
            dueOn,
            status: charge.status,
            isOverdue: dueOn < today,
          }
        }),
      },
    }
  }
}
