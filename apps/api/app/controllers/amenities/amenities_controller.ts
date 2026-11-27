import type { HttpContext } from '@adonisjs/core/http'
import type { Infer } from '@vinejs/vine/types'
import FieldException from '#exceptions/field_exception'
import ResourceException from '#exceptions/resource_exception'
import Amenity from '#models/amenities/amenity'
import AmenityBooking from '#models/amenities/amenity_booking'
import { presentAmenity, storedRules } from '#services/amenities/rules'
import { amenityValidator } from '#validators/amenities/amenities'

type AmenityInput = Infer<typeof amenityValidator>

/**
 * Common areas of the conjunto: how each one is booked, its fees and its
 * rules. docs/amenities.md
 *
 *   GET /amenities   POST /amenities   PUT /amenities/:id   DELETE /amenities/:id
 */
export default class AmenitiesController {
  async index({ tenant }: HttpContext) {
    const amenities = await Amenity.query()
      .where('tenant_id', tenant.id)
      .orderBy('is_active', 'desc')
      .orderBy('name')
    return { data: amenities.map(presentAmenity) }
  }

  async store({ tenant, request, response }: HttpContext) {
    const input = await request.validateUsing(amenityValidator)
    await this.assertName(tenant.id, input.name)
    const amenity = await Amenity.create({ tenantId: tenant.id, ...this.values(input) })
    response.status(201)
    return { data: presentAmenity(amenity) }
  }

  async update({ tenant, params, request }: HttpContext) {
    const amenity = await this.find(tenant.id, params.id)
    const input = await request.validateUsing(amenityValidator)
    await this.assertName(tenant.id, input.name, amenity.id)
    amenity.merge(this.values(input))
    await amenity.save()
    return { data: presentAmenity(amenity) }
  }

  /** With bookings it is only deactivated: its history stays */
  async destroy({ tenant, params, response }: HttpContext) {
    const amenity = await this.find(tenant.id, params.id)
    const used = await AmenityBooking.query().where('amenity_id', amenity.id).first()
    if (used) {
      amenity.isActive = false
      await amenity.save()
      return { data: presentAmenity(amenity) }
    }
    await amenity.delete()
    return response.noContent()
  }

  private async find(tenantId: string, id: string) {
    const amenity = await Amenity.query().where('tenant_id', tenantId).where('id', id).first()
    if (!amenity) throw ResourceException.notFound('La zona común no existe')
    return amenity
  }

  private async assertName(tenantId: string, name: string, exceptId?: string) {
    const taken = await Amenity.query()
      .where('tenant_id', tenantId)
      .whereILike('name', name.trim())
      .if(exceptId, (q) => q.whereNot('id', exceptId!))
      .first()
    if (taken) throw new FieldException('name', 'Ya hay una zona común con ese nombre')
  }

  /** Checks what the validator alone cannot: the schedule and the shifts make sense */
  private values(input: AmenityInput) {
    const rules = { ...input.rules }
    if (rules.opensAt && rules.closesAt && rules.opensAt >= rules.closesAt) {
      throw new FieldException(
        'rules.closesAt',
        'La hora de cierre debe ser posterior a la de apertura'
      )
    }
    if (rules.minHours && rules.maxHours && rules.minHours > rules.maxHours) {
      throw new FieldException('rules.maxHours', 'El máximo de horas es menor que el mínimo')
    }
    if (input.bookingMode === 'shifts') {
      const shifts = rules.shifts ?? []
      if (!shifts.length) throw new FieldException('rules.shifts', 'Agrega al menos un turno')
      if (new Set(shifts.map((shift) => shift.id)).size !== shifts.length) {
        throw new FieldException('rules.shifts', 'Hay turnos repetidos')
      }
      if (new Set(shifts.map((shift) => shift.name.toLowerCase())).size !== shifts.length) {
        throw new FieldException('rules.shifts', 'Cada turno debe tener un nombre distinto')
      }
      const sorted = [...shifts].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      for (const [i, shift] of sorted.entries()) {
        if (shift.startsAt === shift.endsAt) {
          throw new FieldException('rules.shifts', `El turno ${shift.name} empieza y termina igual`)
        }
        const next = sorted[i + 1]
        // Shifts of a day do not overlap (a night shift can go past midnight)
        if (next && shift.endsAt > shift.startsAt && shift.endsAt > next.startsAt) {
          throw new FieldException(
            'rules.shifts',
            `Los turnos ${shift.name} y ${next.name} se cruzan`
          )
        }
      }
    } else {
      delete rules.shifts
    }
    if (input.bookingMode !== 'hours') {
      delete rules.slotMinutes
      delete rules.minHours
      delete rules.maxHours
    }
    if (input.bookingMode !== 'days') delete rules.maxDays
    if ((input.depositAmount ?? 0) > 0 || input.paymentMode === 'prepaid') {
      // Money received before: someone has to verify it
      input.requiresApproval = true
    }
    const fee = (value: number | null | undefined) => (value ? value.toFixed(2) : null)
    return {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      capacity: input.capacity ?? null,
      bookingMode: input.bookingMode,
      bookingFee: fee(input.bookingFee),
      externalFee: input.allowExternal ? fee(input.externalFee) : null,
      depositAmount: fee(input.depositAmount),
      paymentMode: input.paymentMode,
      requiresApproval: input.requiresApproval,
      allowDelinquent: input.allowDelinquent,
      allowGuests: input.allowGuests,
      allowExternal: input.allowExternal,
      terms: input.terms?.trim() || null,
      color: input.color ?? null,
      isActive: input.isActive ?? true,
      rules: storedRules(rules),
    }
  }
}
