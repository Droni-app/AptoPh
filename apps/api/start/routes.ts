/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { BACKOFFICE_ROLES, EnrollmentRole } from '@aptoph/shared'
import { throttlePublic, throttleSignup } from '#start/limiter'

const AuthController = () => import('#controllers/auth_controller')
const InvitationsController = () => import('#controllers/invitations_controller')
const ProfileController = () => import('#controllers/profile_controller')
const AccountController = () => import('#controllers/account_controller')
const MyTenantsController = () => import('#controllers/my_tenants_controller')
const DashboardController = () => import('#controllers/backoffice/dashboard_controller')
const BuildingsController = () => import('#controllers/backoffice/buildings_controller')
const UnitsController = () => import('#controllers/backoffice/units_controller')
const UnitOccupantsController = () => import('#controllers/backoffice/unit_occupants_controller')
const MembersController = () => import('#controllers/backoffice/members_controller')
const SubscriptionController = () => import('#controllers/backoffice/subscription_controller')
const TenantSettingsController = () => import('#controllers/backoffice/tenant_settings_controller')
const ResidentHomeController = () => import('#controllers/resident/home_controller')
const ResidentUnitsController = () => import('#controllers/resident/units_controller')
const ResidentVehiclesController = () => import('#controllers/resident/vehicles_controller')
const ResidentPetsController = () => import('#controllers/resident/pets_controller')
const ResidentHouseholdController = () => import('#controllers/resident/household_controller')
const ResidentVisitsController = () => import('#controllers/resident/visits_controller')
const ResidentParcelsController = () => import('#controllers/resident/parcels_controller')
const ResidentBookingsController = () => import('#controllers/resident/bookings_controller')
const ResidentTicketsController = () => import('#controllers/resident/tickets_controller')

/**
 * Back-office permissions: every back-office role can read,
 * only the administration can write.
 */
const backofficeRead = { roles: [...BACKOFFICE_ROLES] }
const backofficeWrite = { roles: [EnrollmentRole.Administrator] }

router.get('/', () => {
  return { name: 'AptoPH API' }
})

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    /**
     * Authentication: AdonisJS access tokens (email + password)
     */
    router
      .group(() => {
        // Failed logins are limited per email and IP inside the controller
        router.post('login', [AuthController, 'login']).as('login')
        router.post('signup', [AuthController, 'signup']).as('signup').use(throttleSignup)
        router.post('logout', [AuthController, 'logout']).as('logout').use(middleware.auth())
        router
          .group(() => {
            router.post('password/forgot', [AuthController, 'forgotPassword']).as('password.forgot')
            router.post('password/reset', [AuthController, 'resetPassword']).as('password.reset')
            router.post('email/verify', [AuthController, 'verifyEmail']).as('email.verify')
          })
          .use(throttlePublic)
      })
      .prefix('auth')
      .as('auth')

    /**
     * Invitation links (public): see the invitation, accept it
     */
    router
      .group(() => {
        router.get(':token', [InvitationsController, 'show']).as('show')
        router.post('accept', [InvitationsController, 'accept']).as('accept')
      })
      .prefix('invitations')
      .as('invitations')
      .use(throttlePublic)

    /**
     * Authenticated user, no tenant needed
     */
    router
      .group(() => {
        router.get('profile', [ProfileController, 'show']).as('show')
        router.patch('profile', [AccountController, 'updateProfile']).as('update')
        router.put('password', [AccountController, 'changePassword']).as('password')
        router.get('sessions', [AccountController, 'sessions']).as('sessions.index')
        router
          .delete('sessions/:sessionId', [AccountController, 'destroySession'])
          .as('sessions.destroy')
          .where('sessionId', router.matchers.number())
        router
          .delete('sessions', [AccountController, 'destroyOtherSessions'])
          .as('sessions.destroyOthers')
        router
          .post('email/verification', [AccountController, 'sendVerification'])
          .as('email.verification')
        router.get('tenants', [MyTenantsController, 'index']).as('tenants')
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    /**
     * Tenant-scoped routes: require the `X-Tenant-Id` header
     */
    router
      .group(() => {
        router.get('tenant', [MyTenantsController, 'current']).as('tenant.current')
      })
      .use([middleware.auth(), middleware.tenant()])

    /**
     * Residents (web and mobile apps): only their own units
     */
    router
      .group(() => {
        router.get('home', [ResidentHomeController, 'show']).as('home')
        router.get('units/:id', [ResidentUnitsController, 'show']).as('units.show')

        // Things of their own units
        router
          .post('units/:unitId/vehicles', [ResidentVehiclesController, 'store'])
          .as('vehicles.store')
        router.patch('vehicles/:id', [ResidentVehiclesController, 'update']).as('vehicles.update')
        router
          .delete('vehicles/:id', [ResidentVehiclesController, 'destroy'])
          .as('vehicles.destroy')
        router.post('units/:unitId/pets', [ResidentPetsController, 'store']).as('pets.store')
        router.patch('pets/:id', [ResidentPetsController, 'update']).as('pets.update')
        router.delete('pets/:id', [ResidentPetsController, 'destroy']).as('pets.destroy')
        router
          .post('units/:unitId/household', [ResidentHouseholdController, 'store'])
          .as('household.store')
        router
          .patch('household/:id', [ResidentHouseholdController, 'update'])
          .as('household.update')
        router
          .delete('household/:id', [ResidentHouseholdController, 'destroy'])
          .as('household.destroy')

        // Gate: visitors and parcels
        router.get('visits', [ResidentVisitsController, 'index']).as('visits.index')
        router.post('visits', [ResidentVisitsController, 'store']).as('visits.store')
        router.delete('visits/:id', [ResidentVisitsController, 'destroy']).as('visits.destroy')
        router.get('parcels', [ResidentParcelsController, 'index']).as('parcels.index')

        // Common areas
        router.get('amenities', [ResidentBookingsController, 'amenities']).as('amenities.index')
        router.get('bookings', [ResidentBookingsController, 'index']).as('bookings.index')
        router.post('bookings', [ResidentBookingsController, 'store']).as('bookings.store')
        router
          .delete('bookings/:id', [ResidentBookingsController, 'destroy'])
          .as('bookings.destroy')

        // PQRS
        router.get('tickets', [ResidentTicketsController, 'index']).as('tickets.index')
        router.post('tickets', [ResidentTicketsController, 'store']).as('tickets.store')
        router.get('tickets/:id', [ResidentTicketsController, 'show']).as('tickets.show')
        router
          .post('tickets/:id/comments', [ResidentTicketsController, 'comment'])
          .as('tickets.comments.store')
      })
      .prefix('resident')
      .as('resident')
      .use([middleware.auth(), middleware.tenant({ roles: [EnrollmentRole.Resident] })])

    /**
     * Back-office: read
     */
    router
      .group(() => {
        router.get('dashboard', [DashboardController, 'show']).as('dashboard')
        router.get('buildings', [BuildingsController, 'index']).as('buildings.index')
        router.get('buildings/:id', [BuildingsController, 'show']).as('buildings.show')
        router.get('units', [UnitsController, 'index']).as('units.index')
        router.get('units/:id', [UnitsController, 'show']).as('units.show')
        router
          .get('units/:unitId/occupants', [UnitOccupantsController, 'index'])
          .as('occupants.index')
        router.get('members', [MembersController, 'index']).as('members.index')
        router.get('subscription', [SubscriptionController, 'show']).as('subscription.show')
        router.get('settings/tenant', [TenantSettingsController, 'show']).as('settings.tenant')
      })
      .use([middleware.auth(), middleware.tenant(backofficeRead)])

    /**
     * Back-office: plan and billing (administration, also while the plan is locked)
     */
    router
      .post('subscription/activation', [SubscriptionController, 'requestActivation'])
      .as('subscription.activation')
      .use([middleware.auth(), middleware.tenant(backofficeWrite)])

    /**
     * Back-office: write (administration)
     */
    router
      .group(() => {
        router.post('buildings', [BuildingsController, 'store']).as('buildings.store')
        router.patch('buildings/:id', [BuildingsController, 'update']).as('buildings.update')
        router.delete('buildings/:id', [BuildingsController, 'destroy']).as('buildings.destroy')
        router.post('units', [UnitsController, 'store']).as('units.store')
        router.patch('units/:id', [UnitsController, 'update']).as('units.update')
        router.delete('units/:id', [UnitsController, 'destroy']).as('units.destroy')
        router
          .post('units/:unitId/occupants', [UnitOccupantsController, 'store'])
          .as('occupants.store')
        router
          .patch('units/:unitId/occupants/:id', [UnitOccupantsController, 'update'])
          .as('occupants.update')
        router
          .delete('units/:unitId/occupants/:id', [UnitOccupantsController, 'destroy'])
          .as('occupants.destroy')
        router.post('members', [MembersController, 'store']).as('members.store')
        router.patch('members/:id', [MembersController, 'update']).as('members.update')
        router.patch('members/:id/status', [MembersController, 'changeStatus']).as('members.status')
        router
          .post('members/:id/invitation', [MembersController, 'resendInvitation'])
          .as('members.invitation')
        router
          .patch('settings/tenant', [TenantSettingsController, 'update'])
          .as('settings.tenant.update')
      })
      .use([middleware.auth(), middleware.tenant(backofficeWrite), middleware.subscription()])
  })
  .where('id', router.matchers.uuid())
  .where('unitId', router.matchers.uuid())
  .prefix('/api/v1')
