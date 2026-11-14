/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { BACKOFFICE_ROLES, EnrollmentRole } from '@apartadock/shared'

const AuthorizeController = () => import('#controllers/oauth/authorize_controller')
const TokenController = () => import('#controllers/oauth/token_controller')
const RevokeController = () => import('#controllers/oauth/revoke_controller')
const LogoutController = () => import('#controllers/oauth/logout_controller')
const ProfileController = () => import('#controllers/profile_controller')
const AccessTokensController = () => import('#controllers/access_tokens_controller')
const MyTenantsController = () => import('#controllers/my_tenants_controller')
const DashboardController = () => import('#controllers/backoffice/dashboard_controller')
const BuildingsController = () => import('#controllers/backoffice/buildings_controller')
const UnitsController = () => import('#controllers/backoffice/units_controller')
const UnitOccupantsController = () => import('#controllers/backoffice/unit_occupants_controller')
const MembersController = () => import('#controllers/backoffice/members_controller')

/**
 * Back-office permissions: every back-office role can read,
 * only the administration can write.
 */
const backofficeRead = { roles: [...BACKOFFICE_ROLES] }
const backofficeWrite = { roles: [EnrollmentRole.Administrator] }

router.get('/', () => {
  return { name: 'ApartaDock API' }
})

/*
|--------------------------------------------------------------------------
| OAuth 2.1 authorization server (Authorization Code + PKCE)
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.get('authorize', [AuthorizeController, 'show']).as('authorize')
    router.post('authorize', [AuthorizeController, 'store']).as('authorize.store')
    router.post('token', [TokenController]).as('token')
    router.post('revoke', [RevokeController]).as('revoke')
    router.get('logout', [LogoutController]).as('logout')
  })
  .prefix('oauth')
  .as('oauth')

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    /**
     * Authenticated user, no tenant needed
     */
    router
      .group(() => {
        router.get('profile', [ProfileController, 'show']).as('show')
        router.get('tenants', [MyTenantsController, 'index']).as('tenants')
        router.post('logout', [AccessTokensController, 'destroy']).as('logout')
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
      })
      .use([middleware.auth(), middleware.tenant(backofficeRead)])

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
      })
      .use([middleware.auth(), middleware.tenant(backofficeWrite)])
  })
  .where('id', router.matchers.uuid())
  .where('unitId', router.matchers.uuid())
  .prefix('/api/v1')
