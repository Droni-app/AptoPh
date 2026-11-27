import type { HttpContext } from '@adonisjs/core/http'
import BuildingTransformer from '#transformers/property/building_transformer'
import { createBuildingValidator, updateBuildingValidator } from '#validators/property/building'

export default class BuildingsController {
  async index({ tenant, serialize }: HttpContext) {
    const buildings = await tenant
      .related('buildings')
      .query()
      .withCount('units', (query) => query.whereNull('deleted_at'))
      .orderBy('sort_order')
      .orderBy('name')

    return serialize(BuildingTransformer.transform(buildings))
  }

  async store({ tenant, request, response, serialize }: HttpContext) {
    const data = await request.validateUsing(createBuildingValidator)
    const building = await tenant.related('buildings').create(data)
    response.status(201)
    return serialize(BuildingTransformer.transform(building))
  }

  async show({ tenant, params, serialize }: HttpContext) {
    const building = await tenant
      .related('buildings')
      .query()
      .where('id', params.id)
      .withCount('units', (query) => query.whereNull('deleted_at'))
      .firstOrFail()
    return serialize(BuildingTransformer.transform(building))
  }

  async update({ tenant, params, request, serialize }: HttpContext) {
    const building = await tenant.related('buildings').query().where('id', params.id).firstOrFail()
    building.merge(await request.validateUsing(updateBuildingValidator))
    await building.save()
    return serialize(BuildingTransformer.transform(building))
  }

  /**
   * Fails with 409 while the building has units (FK RESTRICT)
   */
  async destroy({ tenant, params, response }: HttpContext) {
    const building = await tenant.related('buildings').query().where('id', params.id).firstOrFail()
    await building.delete()
    return response.noContent()
  }
}
