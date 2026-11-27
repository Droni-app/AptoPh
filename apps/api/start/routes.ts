/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import {
  ANNOUNCEMENT_WRITE_ROLES,
  BACKOFFICE_ROLES,
  EnrollmentRole,
  FINANCE_ATTACHMENT_OWNER_TYPES,
  FINANCE_READ_ROLES,
  FINANCE_WRITE_ROLES,
} from '@aptoph/shared'
import { throttleBilling, throttlePublic, throttleSignup } from '#start/limiter'

const AuthController = () => import('#controllers/auth/auth_controller')
const InvitationsController = () => import('#controllers/tenants/invitations_controller')
const ProfileController = () => import('#controllers/auth/profile_controller')
const AccountController = () => import('#controllers/auth/account_controller')
const MyTenantsController = () => import('#controllers/tenants/my_tenants_controller')
const DashboardController = () => import('#controllers/dashboard/dashboard_controller')
const BuildingsController = () => import('#controllers/property/buildings_controller')
const UnitsController = () => import('#controllers/property/units_controller')
const UnitOccupantsController = () => import('#controllers/property/unit_occupants_controller')
const MembersController = () => import('#controllers/tenants/members_controller')
const SubscriptionController = () => import('#controllers/billing/subscription_controller')
const EmailQuotaController = () => import('#controllers/announcements/email_quota_controller')
const SubscriptionBillingController = () =>
  import('#controllers/billing/subscription_billing_controller')
const WompiController = () => import('#controllers/billing/wompi_controller')
const TenantSettingsController = () => import('#controllers/tenants/tenant_settings_controller')
const ResidentHomeController = () => import('#controllers/dashboard/resident_home_controller')
const ResidentUnitsController = () => import('#controllers/property/resident_units_controller')
const ResidentVehiclesController = () =>
  import('#controllers/property/resident_vehicles_controller')
const ResidentPetsController = () => import('#controllers/property/resident_pets_controller')
const ResidentHouseholdController = () =>
  import('#controllers/property/resident_household_controller')
const ResidentVisitsController = () => import('#controllers/gatehouse/resident_visits_controller')
const ResidentParcelsController = () => import('#controllers/gatehouse/resident_parcels_controller')
const ResidentBookingsController = () =>
  import('#controllers/amenities/resident_bookings_controller')
const ResidentTicketsController = () => import('#controllers/tickets/resident_tickets_controller')
const ResidentFinanceController = () => import('#controllers/finance/resident_finance_controller')
const ResidentAnnouncementsController = () =>
  import('#controllers/announcements/resident_announcements_controller')
const AnnouncementsController = () => import('#controllers/announcements/announcements_controller')
const FinanceOverviewController = () => import('#controllers/finance/overview_controller')
const FinanceAccountsController = () => import('#controllers/finance/accounts_controller')
const CashAccountsController = () => import('#controllers/finance/cash_accounts_controller')
const BillingController = () => import('#controllers/finance/billing_controller')
const FeesController = () => import('#controllers/finance/fees_controller')
const PaymentsController = () => import('#controllers/finance/payments_controller')
const PayablesController = () => import('#controllers/finance/payables_controller')
const BudgetsController = () => import('#controllers/finance/budgets_controller')
const AccountingController = () => import('#controllers/finance/accounting_controller')
const AttachmentsController = () => import('#controllers/finance/attachments_controller')

/**
 * Back-office permissions: every back-office role can read,
 * only the administration can write.
 */
const backofficeRead = { roles: [...BACKOFFICE_ROLES] }
const backofficeWrite = { roles: [EnrollmentRole.Administrator] }
const announcementsWrite = { roles: [...ANNOUNCEMENT_WRITE_ROLES] }
const financeRead = { roles: [...FINANCE_READ_ROLES] }
const financeWrite = { roles: [...FINANCE_WRITE_ROLES] }
/** `:ownerType` of the finance attachment routes */
const ATTACHMENT_OWNER_MATCHER = {
  match: new RegExp(`^(${FINANCE_ATTACHMENT_OWNER_TYPES.join('|')})$`),
}

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

        // Statement and payments
        router
          .get('units/:unitId/statement', [ResidentFinanceController, 'statement'])
          .as('statement')
        router
          .post('units/:unitId/payments', [ResidentFinanceController, 'report'])
          .as('payments.report')
        router.get('payments', [ResidentFinanceController, 'payments']).as('payments.index')
        router
          .post('payments/:id/attachments', [ResidentFinanceController, 'attach'])
          .as('payments.attachments.store')
        router
          .get('attachments/:id/url', [ResidentFinanceController, 'attachmentUrl'])
          .as('attachments.url')
        router
          .delete('attachments/:id', [ResidentFinanceController, 'detach'])
          .as('attachments.destroy')

        // Comunicados
        router
          .get('announcements', [ResidentAnnouncementsController, 'index'])
          .as('announcements.index')
        router
          .get('announcements/attachments/:id/url', [
            ResidentAnnouncementsController,
            'attachmentUrl',
          ])
          .as('announcements.attachments.url')
        router
          .get('announcements/:id', [ResidentAnnouncementsController, 'show'])
          .as('announcements.show')
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
        router.get('email-quota', [EmailQuotaController, 'show']).as('emailQuota.show')
        router.get('settings/tenant', [TenantSettingsController, 'show']).as('settings.tenant')
        router.get('announcements', [AnnouncementsController, 'index']).as('announcements.index')
        router
          .get('announcements/attachments/:id/url', [AnnouncementsController, 'attachmentUrl'])
          .as('announcements.attachments.url')
        router.get('announcements/:id', [AnnouncementsController, 'show']).as('announcements.show')
        router
          .get('announcements/:id/readers', [AnnouncementsController, 'readers'])
          .as('announcements.readers')
      })
      .use([middleware.auth(), middleware.tenant(backofficeRead)])

    /**
     * Back-office: comunicados (administration and council)
     */
    router
      .group(() => {
        router.post('announcements', [AnnouncementsController, 'store']).as('store')
        router
          .post('announcements/email-preview', [AnnouncementsController, 'emailPreview'])
          .as('emailPreview')
        router.put('announcements/:id', [AnnouncementsController, 'update']).as('update')
        router.post('announcements/:id/publish', [AnnouncementsController, 'publish']).as('publish')
        router
          .post('announcements/:id/unpublish', [AnnouncementsController, 'unpublish'])
          .as('unpublish')
        router.delete('announcements/:id', [AnnouncementsController, 'destroy']).as('destroy')
        router
          .post('announcements/:id/attachments', [AnnouncementsController, 'attach'])
          .as('attachments.store')
        router
          .delete('announcements/attachments/:id', [AnnouncementsController, 'detach'])
          .as('attachments.destroy')
      })
      .as('announcements')
      .use([middleware.auth(), middleware.tenant(announcementsWrite), middleware.subscription()])

    /**
     * Back-office: payments to AptoPH with Wompi (administration, also while the
     * plan is locked, so it can be paid). docs/billing.md
     */
    router
      .group(() => {
        router.get('billing', [SubscriptionBillingController, 'show']).as('show')
        router.get('billing/config', [SubscriptionBillingController, 'config']).as('config')
        router
          .get('billing/charges/:id', [SubscriptionBillingController, 'charge'])
          .as('charges.show')
        router
          .get('billing/tokens/:type/:tokenId', [SubscriptionBillingController, 'tokenStatus'])
          .where('type', { match: /^(nequi|daviplata|bancolombia_transfer)$/ })
          .as('tokens.show')
        router
          .put('billing/subscription/auto-renew', [SubscriptionBillingController, 'autoRenew'])
          .as('autoRenew')
        router
          .delete('billing/payment-method', [SubscriptionBillingController, 'removePaymentMethod'])
          .as('paymentMethod.destroy')
        router
          .group(() => {
            router
              .put('billing/payment-method', [SubscriptionBillingController, 'savePaymentMethod'])
              .as('paymentMethod.save')
            router
              .post('billing/tokens/nequi', [SubscriptionBillingController, 'nequiToken'])
              .as('tokens.nequi')
            router
              .post('billing/tokens/daviplata', [SubscriptionBillingController, 'daviplataToken'])
              .as('tokens.daviplata')
            router
              .post('billing/tokens/daviplata/otp', [SubscriptionBillingController, 'daviplataOtp'])
              .as('tokens.daviplataOtp')
            router
              .post('billing/tokens/bancolombia', [
                SubscriptionBillingController,
                'bancolombiaToken',
              ])
              .as('tokens.bancolombia')
            router
              .post('billing/subscription/pay', [SubscriptionBillingController, 'paySubscription'])
              .as('pay')
            router.post('email-quota/packs', [EmailQuotaController, 'buy']).as('emailPacks')
          })
          .use(throttleBilling)
      })
      .as('billing')
      .use([middleware.auth(), middleware.tenant(backofficeWrite)])

    /**
     * Wompi's events (public; verified by their checksum)
     */
    router.post('webhooks/wompi', [WompiController, 'handle']).as('webhooks.wompi')

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

    /**
     * Finance: read (administration, accounting, council, fiscal reviewer)
     */
    router
      .group(() => {
        router.get('summary', [FinanceOverviewController, 'summary']).as('summary')
        router.get('settings', [FinanceOverviewController, 'settings']).as('settings')
        router.get('accounts', [FinanceAccountsController, 'index']).as('accounts.index')
        router.get('concepts', [FinanceAccountsController, 'concepts']).as('concepts.index')
        router.get('cash-accounts', [CashAccountsController, 'index']).as('cash.index')
        router.get('periods', [BillingController, 'periods']).as('periods.index')
        router.get('periods/preview', [BillingController, 'preview']).as('periods.preview')
        router.get('periods/:id', [BillingController, 'showPeriod']).as('periods.show')
        router.get('charges', [BillingController, 'charges']).as('charges.index')
        router.get('charges/:id', [BillingController, 'showCharge']).as('charges.show')
        router.get('recurring-charges', [FeesController, 'recurring']).as('recurring.index')
        router.get('fee-schedules', [FeesController, 'schedules']).as('schedules.index')
        router.get('modules', [FeesController, 'modules']).as('modules.index')
        router.get('payments', [PaymentsController, 'index']).as('payments.index')
        router.get('payments/:id', [PaymentsController, 'show']).as('payments.show')
        router.get('vendors', [PayablesController, 'vendors']).as('vendors.index')
        router.get('vendors/:id', [PayablesController, 'showVendor']).as('vendors.show')
        router.get('bills', [PayablesController, 'bills']).as('bills.index')
        router.get('bills/:id', [PayablesController, 'showBill']).as('bills.show')
        router.get('vendor-payments', [PayablesController, 'payments']).as('egresos.index')
        router.get('vendor-payments/:id', [PayablesController, 'showPayment']).as('egresos.show')
        router.get('budgets', [BudgetsController, 'index']).as('budgets.index')
        router.get('budgets/:id', [BudgetsController, 'show']).as('budgets.show')
        router.get('journal', [AccountingController, 'journal']).as('journal.index')
        router.get('journal/:id', [AccountingController, 'showEntry']).as('journal.show')
        router
          .get('units/:unitId/statement', [AccountingController, 'statement'])
          .as('units.statement')
        router
          .get('aging/receivables', [AccountingController, 'receivables'])
          .as('aging.receivables')
        router.get('aging/payables', [AccountingController, 'payables']).as('aging.payables')
        router
          .get('reports/trial-balance', [AccountingController, 'trialBalance'])
          .as('reports.trialBalance')
        router
          .get('reports/income-statement', [AccountingController, 'incomeStatement'])
          .as('reports.incomeStatement')
        router
          .get('reports/balance-sheet', [AccountingController, 'balanceSheet'])
          .as('reports.balanceSheet')
        router.get('reports/ledger', [AccountingController, 'ledger']).as('reports.ledger')
        router
          .get('attachments/:ownerType/:ownerId', [AttachmentsController, 'index'])
          .where('ownerType', ATTACHMENT_OWNER_MATCHER)
          .where('ownerId', router.matchers.uuid())
          .as('attachments.index')
        router.get('attachments/:id/url', [AttachmentsController, 'url']).as('attachments.url')
      })
      .prefix('finance')
      .as('finance')
      .use([middleware.auth(), middleware.tenant(financeRead), middleware.finance()])

    /**
     * Finance: write (administration and accounting)
     */
    router
      .group(() => {
        router.put('settings', [FinanceOverviewController, 'updateSettings']).as('settings.update')
        router.post('accounts', [FinanceAccountsController, 'store']).as('accounts.store')
        router.patch('accounts/:id', [FinanceAccountsController, 'update']).as('accounts.update')
        router.post('concepts', [FinanceAccountsController, 'storeConcept']).as('concepts.store')
        router
          .put('concepts/:id', [FinanceAccountsController, 'updateConcept'])
          .as('concepts.update')
        router.post('cash-accounts', [CashAccountsController, 'store']).as('cash.store')
        router.patch('cash-accounts/:id', [CashAccountsController, 'update']).as('cash.update')
        router.post('transfers', [CashAccountsController, 'transfer']).as('transfers.store')
        router.post('periods/generate', [BillingController, 'generate']).as('periods.generate')
        router.post('periods/:id/close', [BillingController, 'close']).as('periods.close')
        router.post('periods/:id/reopen', [BillingController, 'reopen']).as('periods.reopen')
        router.post('charges', [BillingController, 'storeCharges']).as('charges.store')
        router.post('charges/:id/cancel', [BillingController, 'cancelCharge']).as('charges.cancel')
        router
          .post('charges/:id/credit-note', [BillingController, 'creditNote'])
          .as('charges.creditNote')
        router.post('recurring-charges', [FeesController, 'storeRecurring']).as('recurring.store')
        router
          .post('recurring-charges/:id/end', [FeesController, 'endRecurring'])
          .as('recurring.end')
        router
          .post('fee-schedules/preview', [FeesController, 'previewSchedule'])
          .as('schedules.preview')
        router.post('fee-schedules', [FeesController, 'applySchedule']).as('schedules.store')
        router.post('modules', [FeesController, 'storeModule']).as('modules.store')
        router.put('modules/:id', [FeesController, 'updateModule']).as('modules.update')
        router.delete('modules/:id', [FeesController, 'destroyModule']).as('modules.destroy')
        router.post('payments', [PaymentsController, 'store']).as('payments.store')
        router.post('payments/:id/confirm', [PaymentsController, 'confirm']).as('payments.confirm')
        router.post('payments/:id/reject', [PaymentsController, 'reject']).as('payments.reject')
        router.post('payments/:id/reverse', [PaymentsController, 'reverse']).as('payments.reverse')
        router.post('vendors', [PayablesController, 'storeVendor']).as('vendors.store')
        router.put('vendors/:id', [PayablesController, 'updateVendor']).as('vendors.update')
        router.post('bills', [PayablesController, 'storeBill']).as('bills.store')
        router.post('bills/:id/cancel', [PayablesController, 'cancelBill']).as('bills.cancel')
        router.post('vendor-payments', [PayablesController, 'storePayment']).as('egresos.store')
        router
          .post('vendor-payments/:id/reverse', [PayablesController, 'reversePayment'])
          .as('egresos.reverse')
        router.post('budgets', [BudgetsController, 'store']).as('budgets.store')
        router.put('budgets/:id', [BudgetsController, 'update']).as('budgets.update')
        router.post('budgets/:id/approve', [BudgetsController, 'approve']).as('budgets.approve')
        router.post('budgets/:id/reopen', [BudgetsController, 'reopen']).as('budgets.reopen')
        router.delete('budgets/:id', [BudgetsController, 'destroy']).as('budgets.destroy')
        router.post('journal', [AccountingController, 'storeEntry']).as('journal.store')
        router
          .post('journal/:id/reverse', [AccountingController, 'reverseEntry'])
          .as('journal.reverse')
        router
          .post('attachments/:ownerType/:ownerId', [AttachmentsController, 'store'])
          .where('ownerType', ATTACHMENT_OWNER_MATCHER)
          .where('ownerId', router.matchers.uuid())
          .as('attachments.store')
        router
          .delete('attachments/:id', [AttachmentsController, 'destroy'])
          .as('attachments.destroy')
      })
      .prefix('finance')
      .as('finance.write')
      .use([
        middleware.auth(),
        middleware.tenant(financeWrite),
        middleware.subscription(),
        middleware.finance(),
      ])
  })
  .where('id', router.matchers.uuid())
  .where('unitId', router.matchers.uuid())
  .prefix('/api/v1')
