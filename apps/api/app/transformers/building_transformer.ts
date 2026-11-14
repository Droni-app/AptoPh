import type Building from '#models/building'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class BuildingTransformer extends BaseTransformer<Building> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'name', 'floors', 'sortOrder', 'createdAt', 'updatedAt']),
      unitsCount:
        this.resource.$extras.units_count === undefined
          ? undefined
          : Number(this.resource.$extras.units_count),
    }
  }
}
