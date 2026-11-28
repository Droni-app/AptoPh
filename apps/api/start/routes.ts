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
  TICKET_READ_ROLES,
  AMENITY_MANAGE_ROLES,
  SURVEY_MANAGE_ROLES,
  SURVEY_READ_ROLES,
  AMENITY_READ_ROLES,
  TICKET_WORK_ROLES,
  VISITOR_PARKING_ADMIN_ROLES,
  PARKING_MANAGE_ROLES,
  PARKING_READ_ROLES,
  VISITOR_PARKING_ROLES,
  REPORT_ROLES,
  AUDIT_READ_ROLES,
} from '@aptoph/shared'
import { throttleBilling, throttlePublic, throttleSignup } from '#start/limiter'

const AuthController = () => import('#controllers/auth/auth_controller')
const GoogleAuthController = () => import('#controllers/auth/google_auth_controller')
const InvitationsController = () => import('#controllers/tenants/invitations_controller')
const ProfileController = () => import('#controllers/auth/profile_controller')
const AccountController = () => import('#controllers/auth/account_controller')
const NotificationsController = () => import('#controllers/notifications/notifications_controller')
const NotificationSettingsController = () =>
  import('#controllers/notifications/notification_settings_controller')
const MyTenantsController = () => import('#controllers/tenants/my_tenants_controller')
const DashboardController = () => import('#controllers/dashboard/dashboard_controller')
const BuildingsController = () => import('#controllers/property/buildings_controller')
const UnitsController = () => import('#controllers/property/units_controller')
const UnitOccupantsController = () => import('#controllers/property/unit_occupants_controller')
const MembersController = () => import('#controllers/tenants/members_controller')
const PropertyImportController = () => import('#controllers/property/property_import_controller')
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
const TicketsController = () => import('#controllers/tickets/tickets_controller')
const AmenitiesController = () => import('#controllers/amenities/amenities_controller')
const BookingsController = () => import('#controllers/amenities/bookings_controller')
const VisitorParkingController = () => import('#controllers/gatehouse/visitor_parking_controller')
const ParkingController = () => import('#controllers/property/parking_controller')
const ParkingLotteriesController = () =>
  import('#controllers/property/parking_lotteries_controller')
const ResidentParkingController = () => import('#controllers/property/resident_parking_controller')
const ResidentFinanceController = () => import('#controllers/finance/resident_finance_controller')
const ResidentAnnouncementsController = () =>
  import('#controllers/announcements/resident_announcements_controller')
const AnnouncementsController = () => import('#controllers/announcements/announcements_controller')
const DocumentsController = () => import('#controllers/documents/documents_controller')
const SurveysController = () => import('#controllers/surveys/surveys_controller')
const ResidentSurveysController = () => import('#controllers/surveys/resident_surveys_controller')
const ResidentDocumentsController = () =>
  import('#controllers/documents/resident_documents_controller')
const AnnouncementImagesController = () =>
  import('#controllers/announcements/announcement_images_controller')
const FinanceOverviewController = () => import('#controllers/finance/overview_controller')
const FinanceAccountsController = () => import('#controllers/finance/accounts_controller')
const CashAccountsController = () => import('#controllers/finance/cash_accounts_controller')
const BillingController = () => import('#controllers/finance/billing_controller')
const FeesController = () => import('#controllers/finance/fees_controller')
const PaymentsController = () => import('#controllers/finance/payments_controller')
const ClearancesController = () => import('#controllers/finance/clearances_controller')
const ReconciliationController = () => import('#controllers/finance/reconciliation_controller')
const PayablesController = () => import('#controllers/finance/payables_controller')
const BudgetsController = () => import('#controllers/finance/budgets_controller')
const AccountingController = () => import('#controllers/finance/accounting_controller')
const AttachmentsController = () => import('#controllers/finance/attachments_controller')
const ReportsController = () => import('#controllers/reports/reports_controller')
const AuditLogsController = () => import('#controllers/audit/audit_logs_controller')

/**
 * Back-office permissions: every back-office role can read,
 * only the administration can write.
 */
const backofficeRead = { roles: [...BACKOFFICE_ROLES] }
const backofficeWrite = { roles: [EnrollmentRole.Administrator] }
const announcementsWrite = { roles: [...ANNOUNCEMENT_WRITE_ROLES] }
const ticketsRead = { roles: [...TICKET_READ_ROLES] }
const amenitiesRead = { roles: [...AMENITY_READ_ROLES] }
const amenitiesManage = { roles: [...AMENITY_MANAGE_ROLES] }
const surveysRead = { roles: [...SURVEY_READ_ROLES] }
const surveysManage = { roles: [...SURVEY_MANAGE_ROLES] }
const ticketsWork = { roles: [...TICKET_WORK_ROLES] }
const parkingGate = { roles: [...VISITOR_PARKING_ROLES] }
const parkingAdmin = { roles: [...VISITOR_PARKING_ADMIN_ROLES] }
const spotsRead = { roles: [...PARKING_READ_ROLES] }
const spotsManage = { roles: [...PARKING_MANAGE_ROLES] }
/** The lottery: the council consults it, the guards do not */
const lotteriesRead = {
  roles: PARKING_READ_ROLES.filter((role) => role !== 'security_guard'),
}
const financeRead = { roles: [...FINANCE_READ_ROLES] }
const financeWrite = { roles: [...FINANCE_WRITE_ROLES] }
/** Reports and audit log: each report also checks its own roles */
const reportsRead = { roles: [...REPORT_ROLES] }
const auditRead = { roles: [...AUDIT_READ_ROLES] }
const REPORT_KEY = { match: /^[a-z_]+$/ }
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
            // Sign in and sign up with Google
            router.get('providers', [GoogleAuthController, 'providers']).as('providers')
            router.get('google/url', [GoogleAuthController, 'start']).as('google.start')
            router.post('google', [GoogleAuthController, 'callback']).as('google.callback')
            router.post('google/token', [GoogleAuthController, 'token']).as('google.token')
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
        // Notifications: channels by category and phones of the mobile app
        router
          .get('notification-preferences', [NotificationSettingsController, 'show'])
          .as('notifications.preferences')
        router
          .put('notification-preferences', [NotificationSettingsController, 'update'])
          .as('notifications.preferences.update')
        router
          .post('push-devices', [NotificationSettingsController, 'registerDevice'])
          .as('push.store')
        router
          .delete('push-devices/:token', [NotificationSettingsController, 'removeDevice'])
          .as('push.destroy')
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    /**
     * The bell: notifications of the person in the conjunto (any role).
     * docs/notifications.md
     */
    router
      .group(() => {
        router.get('/', [NotificationsController, 'index']).as('index')
        router.get('unread', [NotificationsController, 'unreadCount']).as('unread')
        router.post('read-all', [NotificationsController, 'readAll']).as('readAll')
        router.post(':id/read', [NotificationsController, 'read']).as('read')
      })
      .prefix('notifications')
      .as('notifications')
      .use([middleware.auth(), middleware.tenant()])

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
        router
          .get('amenities/:id/availability', [ResidentBookingsController, 'availability'])
          .as('amenities.availability')
        router.get('bookings', [ResidentBookingsController, 'index']).as('bookings.index')
        router.post('bookings/quote', [ResidentBookingsController, 'quote']).as('bookings.quote')
        router
          .get('bookings/attachments/:id/url', [ResidentBookingsController, 'attachmentUrl'])
          .as('bookings.attachments.url')
        router.get('bookings/:id', [ResidentBookingsController, 'show']).as('bookings.show')
        router.post('bookings', [ResidentBookingsController, 'store']).as('bookings.store')
        router
          .post('bookings/:id/attachments', [ResidentBookingsController, 'attach'])
          .as('bookings.attachments.store')
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
          .get('payments/:id/receipt', [ResidentFinanceController, 'receipt'])
          .as('payments.receipt')
        router
          .get('units/:unitId/clearance', [ResidentFinanceController, 'clearance'])
          .as('clearance.show')
        router
          .post('units/:unitId/clearances', [ResidentFinanceController, 'issueClearance'])
          .as('clearances.store')
        router
          .get('clearances/:id/pdf', [ResidentFinanceController, 'clearancePdf'])
          .as('clearances.pdf')
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
        // Documentos del conjunto (docs/documents.md)
        router.get('documents', [ResidentDocumentsController, 'index']).as('documents.index')
        router
          .get('documents/folders', [ResidentDocumentsController, 'folders'])
          .as('documents.folders')
        router
          .get('documents/files/:id/url', [ResidentDocumentsController, 'fileUrl'])
          .as('documents.files.url')
        router.get('documents/:id', [ResidentDocumentsController, 'show']).as('documents.show')
        // Encuestas (docs/surveys.md)
        router.get('surveys', [ResidentSurveysController, 'index']).as('surveys.index')
        router.get('surveys/:id', [ResidentSurveysController, 'show']).as('surveys.show')
        router.post('surveys/:id/vote', [ResidentSurveysController, 'vote']).as('surveys.vote')
        // Sorteo de parqueaderos
        router.get('parking', [ResidentParkingController, 'show']).as('parking.show')
        router
          .post('parking/applications', [ResidentParkingController, 'apply'])
          .as('parking.apply')
        router
          .post('parking/applications/:id/withdraw', [ResidentParkingController, 'withdraw'])
          .as('parking.withdraw')
        router
          .post('parking/applications/:id/accept', [ResidentParkingController, 'accept'])
          .as('parking.accept')
        router
          .post('parking/applications/:id/decline', [ResidentParkingController, 'decline'])
          .as('parking.decline')
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
        router.put('announcements/:id/image', [AnnouncementsController, 'setImage']).as('image.set')
        router
          .delete('announcements/:id/image', [AnnouncementsController, 'removeImage'])
          .as('image.destroy')
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
     * Common areas: the calendar for whoever needs to know who has the salón,
     * the areas and the review for the administration. docs/amenities.md
     */
    router
      .group(() => {
        router.get('amenities', [AmenitiesController, 'index']).as('amenities.index')
        router.get('bookings/calendar', [BookingsController, 'calendar']).as('bookings.calendar')
        router.get('bookings/stats', [BookingsController, 'stats']).as('bookings.stats')
        router.get('bookings', [BookingsController, 'index']).as('bookings.index')
        router
          .get('bookings/attachments/:id/url', [BookingsController, 'attachmentUrl'])
          .as('bookings.attachments.url')
        router.get('bookings/:id', [BookingsController, 'show']).as('bookings.show')
      })
      .use([middleware.auth(), middleware.tenant(amenitiesRead)])

    router
      .group(() => {
        router.post('amenities', [AmenitiesController, 'store']).as('amenities.store')
        router.put('amenities/:id', [AmenitiesController, 'update']).as('amenities.update')
        router.delete('amenities/:id', [AmenitiesController, 'destroy']).as('amenities.destroy')
        router.post('bookings/quote', [BookingsController, 'quote']).as('bookings.quote')
        router.post('bookings', [BookingsController, 'store']).as('bookings.store')
        router.post('bookings/:id/approve', [BookingsController, 'approve']).as('bookings.approve')
        router.post('bookings/:id/reject', [BookingsController, 'reject']).as('bookings.reject')
        router.post('bookings/:id/cancel', [BookingsController, 'cancel']).as('bookings.cancel')
        router.post('bookings/:id/deposit', [BookingsController, 'deposit']).as('bookings.deposit')
        router
          .post('bookings/:id/attachments', [BookingsController, 'attach'])
          .as('bookings.attachments.store')
        router
          .delete('bookings/attachments/:id', [BookingsController, 'detach'])
          .as('bookings.attachments.destroy')
      })
      .use([middleware.auth(), middleware.tenant(amenitiesManage), middleware.subscription()])

    /**
     * Documents: every back-office role reads what its visibility allows, the
     * administration manages. docs/documents.md
     */
    router
      .group(() => {
        router.get('documents', [DocumentsController, 'index']).as('documents.index')
        router.get('documents/folders', [DocumentsController, 'folders']).as('documents.folders')
        router
          .get('documents/files/:id/url', [DocumentsController, 'fileUrl'])
          .as('documents.files.url')
        router.get('documents/:id', [DocumentsController, 'show']).as('documents.show')
      })
      .use([middleware.auth(), middleware.tenant(backofficeRead)])

    router
      .get('documents-stats', [DocumentsController, 'stats'])
      .as('documents.stats')
      .use([middleware.auth(), middleware.tenant(backofficeWrite)])

    router
      .group(() => {
        router.post('documents', [DocumentsController, 'store']).as('store')
        router.put('documents/:id', [DocumentsController, 'update']).as('update')
        router.delete('documents/:id', [DocumentsController, 'destroy']).as('destroy')
        router
          .post('documents/:id/versions', [DocumentsController, 'addVersion'])
          .as('versions.store')
        router
          .delete('documents/versions/:id', [DocumentsController, 'removeVersion'])
          .as('versions.destroy')
        router.post('documents/:id/publish', [DocumentsController, 'publish']).as('publish')
        router.post('documents/:id/unpublish', [DocumentsController, 'unpublish']).as('unpublish')
        router.post('documents/:id/archive', [DocumentsController, 'archive']).as('archive')
        router.post('documents/:id/restore', [DocumentsController, 'restore']).as('restore')
        router.post('documents/folders', [DocumentsController, 'storeFolder']).as('folders.store')
        router
          .put('documents/folders/:id', [DocumentsController, 'updateFolder'])
          .as('folders.update')
        router
          .delete('documents/folders/:id', [DocumentsController, 'destroyFolder'])
          .as('folders.destroy')
      })
      .as('documents')
      .use([middleware.auth(), middleware.tenant(backofficeWrite), middleware.subscription()])

    /**
     * Surveys: the council and the fiscal reviewer follow the results, the
     * administration creates and publishes. docs/surveys.md
     */
    router
      .group(() => {
        router.get('surveys', [SurveysController, 'index']).as('surveys.index')
        router.get('surveys-stats', [SurveysController, 'stats']).as('surveys.stats')
        router.get('surveys/:id', [SurveysController, 'show']).as('surveys.show')
        router.get('surveys/:id/voters', [SurveysController, 'voters']).as('surveys.voters')
      })
      .use([middleware.auth(), middleware.tenant(surveysRead)])

    router
      .group(() => {
        router.post('surveys', [SurveysController, 'store']).as('store')
        router.put('surveys/:id', [SurveysController, 'update']).as('update')
        router.post('surveys/:id/publish', [SurveysController, 'publish']).as('publish')
        router.delete('surveys/:id', [SurveysController, 'destroy']).as('destroy')
      })
      .as('surveys')
      .use([middleware.auth(), middleware.tenant(surveysManage), middleware.subscription()])

    /**
     * Back-office: PQRS. Administration and council read every ticket, staff only
     * the ones assigned to them; administration and staff answer. docs/tickets.md
     */
    router
      .group(() => {
        router.get('tickets', [TicketsController, 'index']).as('index')
        router.get('tickets/stats', [TicketsController, 'stats']).as('stats')
        router.get('tickets/assignees', [TicketsController, 'assignees']).as('assignees')
        router
          .get('tickets/attachments/:id/url', [TicketsController, 'attachmentUrl'])
          .as('attachments.url')
        router.get('tickets/:id', [TicketsController, 'show']).as('show')
      })
      .as('tickets')
      .use([middleware.auth(), middleware.tenant(ticketsRead)])

    router
      .group(() => {
        router.patch('tickets/:id', [TicketsController, 'update']).as('update')
        router.post('tickets/:id/comments', [TicketsController, 'comment']).as('comments.store')
        router
          .post('tickets/:id/attachments', [TicketsController, 'attach'])
          .as('attachments.store')
        router
          .delete('tickets/attachments/:id', [TicketsController, 'detach'])
          .as('attachments.destroy')
      })
      .as('tickets.write')
      .use([middleware.auth(), middleware.tenant(ticketsWork), middleware.subscription()])

    /**
     * Back-office: visitor parking. Administration and guards register entries
     * and exits; the administration configures it. docs/visitor-parking.md
     */
    router
      .group(() => {
        router.get('summary', [VisitorParkingController, 'summary']).as('summary')
        router.get('settings', [VisitorParkingController, 'settings']).as('settings')
        router.get('lookup', [VisitorParkingController, 'lookup']).as('lookup')
        router.get('stays', [VisitorParkingController, 'index']).as('stays.index')
        router.get('stays/:id', [VisitorParkingController, 'show']).as('stays.show')
      })
      .prefix('visitor-parking')
      .as('visitorParking')
      .use([middleware.auth(), middleware.tenant(parkingGate)])

    router
      .group(() => {
        router.post('stays', [VisitorParkingController, 'store']).as('stays.store')
        router.patch('stays/:id', [VisitorParkingController, 'update']).as('stays.update')
        router.post('stays/:id/exit', [VisitorParkingController, 'exit']).as('stays.exit')
        router.post('stays/:id/receipt', [VisitorParkingController, 'receipt']).as('stays.receipt')
      })
      .prefix('visitor-parking')
      .as('visitorParking.write')
      .use([middleware.auth(), middleware.tenant(parkingGate), middleware.subscription()])

    router
      .put('visitor-parking/settings', [VisitorParkingController, 'updateSettings'])
      .as('visitorParking.settings.update')
      .use([middleware.auth(), middleware.tenant(parkingAdmin), middleware.subscription()])

    /**
     * Back-office: parking of the conjunto (assigned spots). The council and
     * the guards consult it; the administration manages it. docs/parking.md
     */
    router
      .group(() => {
        router.get('summary', [ParkingController, 'summary']).as('summary')
        router.get('spots', [ParkingController, 'spots']).as('spots.index')
        router.get('assignments', [ParkingController, 'assignments']).as('assignments.index')
        router.get('lookup', [ParkingController, 'lookup']).as('lookup')
      })
      .prefix('parking')
      .as('parking')
      .use([middleware.auth(), middleware.tenant(spotsRead)])

    router
      .group(() => {
        router.get('settings', [ParkingController, 'settings']).as('settings')
        router.get('eligibility', [ParkingController, 'eligibility']).as('eligibility')
      })
      .prefix('parking')
      .as('parking.manage.read')
      .use([middleware.auth(), middleware.tenant(spotsManage)])

    router
      .group(() => {
        router.get('lotteries', [ParkingLotteriesController, 'index']).as('lotteries.index')
        router.get('lotteries/:id', [ParkingLotteriesController, 'show']).as('lotteries.show')
        router
          .get('lotteries/:id/applications', [ParkingLotteriesController, 'applications'])
          .as('lotteries.applications')
      })
      .prefix('parking')
      .as('parking.lotteries.read')
      .use([middleware.auth(), middleware.tenant(lotteriesRead)])

    router
      .group(() => {
        router.put('settings', [ParkingController, 'updateSettings']).as('settings.update')
        router.post('spots', [ParkingController, 'storeSpot']).as('spots.store')
        router.post('spots/batch', [ParkingController, 'storeBatch']).as('spots.batch')
        router.post('spots/import', [ParkingController, 'importSpots']).as('spots.import')
        router.patch('spots/:id', [ParkingController, 'updateSpot']).as('spots.update')
        router.delete('spots/:id', [ParkingController, 'destroySpot']).as('spots.destroy')
        router.post('assignments', [ParkingController, 'assign']).as('assignments.store')
        router
          .patch('assignments/:id', [ParkingController, 'updateAssignment'])
          .as('assignments.update')
        router
          .post('assignments/:id/end', [ParkingController, 'endAssignment'])
          .as('assignments.end')
        router.post('lotteries', [ParkingLotteriesController, 'store']).as('lotteries.store')
        router.patch('lotteries/:id', [ParkingLotteriesController, 'update']).as('lotteries.update')
        router
          .post('lotteries/:id/cancel', [ParkingLotteriesController, 'cancel'])
          .as('lotteries.cancel')
        router.post('lotteries/:id/draw', [ParkingLotteriesController, 'draw']).as('lotteries.draw')
        router
          .post('lotteries/:id/offer', [ParkingLotteriesController, 'offer'])
          .as('lotteries.offer')
        router
          .post('lotteries/:id/applications', [ParkingLotteriesController, 'apply'])
          .as('lotteries.apply')
        router
          .post('applications/:id/withdraw', [ParkingLotteriesController, 'withdraw'])
          .as('applications.withdraw')
        router
          .post('applications/:id/assign', [ParkingLotteriesController, 'assign'])
          .as('applications.assign')
      })
      .prefix('parking')
      .as('parking.manage')
      .use([middleware.auth(), middleware.tenant(spotsManage), middleware.subscription()])

    /**
     * Back-office: reports with filters, Excel and CSV (docs/reports.md)
     */
    router
      .group(() => {
        router.get('reports/options', [ReportsController, 'options']).as('options')
        router
          .get('reports/:key/export', [ReportsController, 'export'])
          .where('key', REPORT_KEY)
          .as('export')
        router.get('reports/:key', [ReportsController, 'show']).where('key', REPORT_KEY).as('show')
      })
      .as('reports')
      .use([middleware.auth(), middleware.tenant(reportsRead)])

    /**
     * Back-office: audit log (docs/audit.md)
     */
    router
      .group(() => {
        router.get('audit-logs', [AuditLogsController, 'index']).as('index')
        router.get('audit-logs/export', [AuditLogsController, 'export']).as('export')
        router.get('audit-logs/:id', [AuditLogsController, 'show']).as('show')
      })
      .as('auditLogs')
      .use([middleware.auth(), middleware.tenant(auditRead)])

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
     * Image of a comunicado linked from its email (public; HMAC-signed link).
     * Not throttled by IP: email clients load images from a few proxy IPs.
     */
    /**
     * Verification of a paz y salvo by the code printed on it (public)
     */
    router
      .get('public/clearances/:code', [ClearancesController, 'verify'])
      .as('public.clearances.verify')
      .use(throttlePublic)

    router
      .get('public/announcement-images/:id', [AnnouncementImagesController, 'show'])
      .as('public.announcementImages.show')

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
        router
          .post('imports/property/preview', [PropertyImportController, 'preview'])
          .as('imports.property.preview')
        router
          .post('imports/property/plan', [PropertyImportController, 'plan'])
          .as('imports.property.plan')
        router
          .post('imports/property/rows', [PropertyImportController, 'apply'])
          .as('imports.property.apply')
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
        router.get('payments/:id/receipt', [ClearancesController, 'receipt']).as('payments.receipt')
        router
          .get('units/:unitId/clearance', [ClearancesController, 'status'])
          .as('units.clearance')
        router.get('clearances/:id/pdf', [ClearancesController, 'pdf']).as('clearances.pdf')
        router.get('bank-statements', [ReconciliationController, 'index']).as('statements.index')
        router.get('bank-statements/:id', [ReconciliationController, 'show']).as('statements.show')
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
        router
          .post('units/:unitId/clearances', [ClearancesController, 'store'])
          .as('clearances.store')
        router
          .post('bank-statements/preview', [ReconciliationController, 'preview'])
          .as('statements.preview')
        router.post('bank-statements', [ReconciliationController, 'store']).as('statements.store')
        router
          .delete('bank-statements/:id', [ReconciliationController, 'destroy'])
          .as('statements.destroy')
        router
          .post('bank-statements/:id/apply-suggestions', [
            ReconciliationController,
            'applySuggestions',
          ])
          .as('statements.applySuggestions')
        router
          .post('bank-statement-lines/:id/reconcile', [ReconciliationController, 'reconcile'])
          .as('statementLines.reconcile')
        router
          .post('bank-statement-lines/:id/undo', [ReconciliationController, 'undo'])
          .as('statementLines.undo')
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
