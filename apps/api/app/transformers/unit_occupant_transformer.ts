import type UnitOccupant from '#models/unit_occupant'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UnitOccupantTransformer extends BaseTransformer<UnitOccupant> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'unitId',
        'userId',
        'fullName',
        'documentType',
        'documentNumber',
        'phone',
        'email',
        'relationship',
        'isPrimaryContact',
        'isBillingResponsible',
        'createdAt',
      ]),
      startsOn: this.resource.startsOn?.toISODate() ?? null,
      endsOn: this.resource.endsOn?.toISODate() ?? null,
    }
  }
}
