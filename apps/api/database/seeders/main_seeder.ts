import { BaseSeeder } from '@adonisjs/lucid/seeders'
import app from '@adonisjs/core/services/app'
import Tenant from '#models/tenants/tenant'
import User from '#models/auth/user'
import Enrollment from '#models/tenants/enrollment'
import Building from '#models/property/building'
import Unit from '#models/property/unit'
import UnitOccupant from '#models/property/unit_occupant'

/**
 * Development data: a demo tenant and users.
 * Run with: node ace db:seed
 */
export default class extends BaseSeeder {
  static environment = ['development', 'test']

  async run() {
    if (app.inTest) return

    const tenant = await Tenant.updateOrCreate(
      { slug: 'reservas-del-bosque' },
      { name: 'Conjunto Reservas del Bosque', city: 'Bogotá', status: 'active' }
    )

    const admin = await User.updateOrCreate(
      { email: 'admin@aptoph.test' },
      { fullName: 'Ana Administradora', password: 'password123' }
    )
    const guard = await User.updateOrCreate(
      { email: 'vigilante@aptoph.test' },
      { fullName: 'Víctor Vigilante', password: 'password123' }
    )
    const resident = await User.updateOrCreate(
      { email: 'residente@aptoph.test' },
      { fullName: 'Rafael Residente', password: 'password123' }
    )

    await Enrollment.updateOrCreateMany(
      ['tenantId', 'userId', 'role'],
      [
        { tenantId: tenant.id, userId: admin.id, role: 'administrator', status: 'active' },
        { tenantId: tenant.id, userId: resident.id, role: 'resident', status: 'active' },
        { tenantId: tenant.id, userId: resident.id, role: 'council_member', status: 'active' },
        {
          tenantId: tenant.id,
          userId: guard.id,
          role: 'security_guard',
          status: 'active',
          title: 'Portería turno noche',
        },
      ]
    )

    /**
     * Two towers with 4 floors x 4 apartments each
     */
    for (const [index, name] of ['Torre 1', 'Torre 2'].entries()) {
      const building = await Building.updateOrCreate(
        { tenantId: tenant.id, name },
        { floors: 4, sortOrder: index }
      )
      for (let floor = 1; floor <= 4; floor++) {
        for (let number = 1; number <= 4; number++) {
          const code = `${floor}0${number}`
          await Unit.updateOrCreate(
            { tenantId: tenant.id, buildingId: building.id, code },
            {
              type: 'apartment',
              floor,
              privateArea: '68.50',
              ownershipCoefficient: (1 / 32).toFixed(6),
              status: number === 4 ? 'vacant' : 'occupied',
            }
          )
        }
      }
    }

    const unit101 = await Unit.query()
      .where('tenant_id', tenant.id)
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
  }
}
