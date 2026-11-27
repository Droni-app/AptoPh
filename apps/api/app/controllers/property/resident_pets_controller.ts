import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Pet from '#models/property/pet'
import ResourceException from '#exceptions/resource_exception'
import { findOwnUnit, residentUnitIds } from '#services/resident_scope'
import { presentPet } from '#transformers/property/resident'
import { createPetValidator, updatePetValidator } from '#validators/property/resident'

/**
 * Pets of the resident's units:
 *   POST   /api/v1/resident/units/:unitId/pets
 *   PATCH  /api/v1/resident/pets/:id
 *   DELETE /api/v1/resident/pets/:id   (soft delete)
 */
export default class PetsController {
  async store({ tenant, auth, params, request, response }: HttpContext) {
    await findOwnUnit(tenant, auth.getUserOrFail().id, params.unitId)
    const data = await request.validateUsing(createPetValidator)
    const pet = await Pet.create({
      ...data,
      isPotentiallyDangerous: data.isPotentiallyDangerous ?? false,
      tenantId: tenant.id,
      unitId: params.unitId,
    })
    response.status(201)
    return { data: presentPet(pet) }
  }

  async update(ctx: HttpContext) {
    const pet = await this.find(ctx)
    pet.merge(await ctx.request.validateUsing(updatePetValidator))
    await pet.save()
    return { data: presentPet(pet) }
  }

  async destroy(ctx: HttpContext) {
    const pet = await this.find(ctx)
    pet.deletedAt = DateTime.now()
    await pet.save()
    return ctx.response.noContent()
  }

  private async find({ tenant, auth, params }: HttpContext) {
    const unitIds = await residentUnitIds(tenant, auth.getUserOrFail().id)
    const pet = await Pet.query()
      .where('tenant_id', tenant.id)
      .where('id', params.id)
      .whereIn('unit_id', unitIds)
      .whereNull('deleted_at')
      .first()
    if (!pet) throw ResourceException.notFound('La mascota no existe')
    return pet
  }
}
