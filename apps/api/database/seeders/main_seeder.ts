import { BaseSeeder } from '@adonisjs/lucid/seeders'
import app from '@adonisjs/core/services/app'
import OauthClient from '#models/oauth_client'
import Tenant from '#models/tenant'
import User from '#models/user'
import Enrollment from '#models/enrollment'
import Building from '#models/building'
import Unit from '#models/unit'
import UnitOccupant from '#models/unit_occupant'

/**
 * Development data: first-party OAuth clients, a demo tenant and users.
 * Run with: node ace db:seed
 */
export default class extends BaseSeeder {
  static environment = ['development', 'test']

  async run() {
    await OauthClient.updateOrCreateMany('clientId', [
      {
        clientId: 'web-residents',
        name: 'ApartaDock Residentes',
        type: 'public',
        redirectUris: ['http://localhost:5173/auth/callback'],
        postLogoutRedirectUris: ['http://localhost:5173/'],
      },
      {
        clientId: 'web-admin',
        name: 'ApartaDock Administración',
        type: 'public',
        redirectUris: ['http://localhost:5174/auth/callback'],
        postLogoutRedirectUris: ['http://localhost:5174/'],
      },
      {
        clientId: 'mobile',
        name: 'ApartaDock Móvil',
        type: 'public',
        redirectUris: ['co.apartadock.mobile:/oauth/callback'],
        postLogoutRedirectUris: ['co.apartadock.mobile:/logout'],
      },
    ])

    if (app.inTest) return

    const tenant = await Tenant.updateOrCreate(
      { slug: 'reservas-del-bosque' },
      { name: 'Conjunto Reservas del Bosque', city: 'Bogotá', status: 'active' }
    )

    const admin = await User.updateOrCreate(
      { email: 'admin@apartadock.test' },
      { fullName: 'Ana Administradora', password: 'password123' }
    )
    const guard = await User.updateOrCreate(
      { email: 'vigilante@apartadock.test' },
      { fullName: 'Víctor Vigilante', password: 'password123' }
    )
    const resident = await User.updateOrCreate(
      { email: 'residente@apartadock.test' },
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
