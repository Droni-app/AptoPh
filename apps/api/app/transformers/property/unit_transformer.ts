import type Unit from '#models/property/unit'
import { BaseTransformer } from '@adonisjs/core/transformers'
import BuildingTransformer from '#transformers/property/building_transformer'
import UnitOccupantTransformer from '#transformers/property/unit_occupant_transformer'

export default class UnitTransformer extends BaseTransformer<Unit> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'buildingId',
        'code',
        'type',
        'floor',
        'parentUnitId',
        'status',
        'notes',
        'createdAt',
        'updatedAt',
      ]),
      /**
       * numeric columns are returned as strings to keep precision
       */
      privateArea: this.resource.privateArea,
      ownershipCoefficient: this.resource.ownershipCoefficient,
      building: BuildingTransformer.transform(this.whenLoaded(this.resource.building)),
      occupants: UnitOccupantTransformer.transform(this.whenLoaded(this.resource.occupants)),
      occupantsCount:
        this.resource.$extras.occupants_count === undefined
          ? undefined
          : Number(this.resource.$extras.occupants_count),
    }
  }
}
