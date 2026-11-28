import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useSubscriptionStore } from '@/stores/subscription'

declare module 'vue-router' {
  interface RouteMeta {
    /** Accessible without a session */
    public?: boolean
    /** Login and sign-up: a signed-in user goes straight to the app */
    guest?: boolean
    /** Requires an active tenant (X-Tenant-Id) */
    tenant?: boolean
    /** Finance pages: administration, accounting, council and fiscal reviewer */
    finance?: boolean
    /** Administration only */
    manage?: boolean
    /** PQRS: administration, council and staff */
    tickets?: boolean
    /** Visitor parking: administration and guards */
    parking?: boolean
    /** Common areas calendar */
    amenities?: boolean
    surveys?: boolean
    /** Parking of the conjunto: administration, council and guards */
    spots?: boolean
    /** Reports: administration, accounting, council and fiscal reviewer */
    reports?: boolean
    /** Audit log: administration, fiscal reviewer, council and accounting */
    audit?: boolean
    title?: string
  }
}

const router = createRouter({
  // Only anchors (#notificaciones): the rest keeps the scroll as it was
  scrollBehavior: (to) => (to.hash ? { el: to.hash, top: 80 } : undefined),
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true, guest: true, title: 'Iniciar sesión' },
    },
    {
      // Google sends the browser back here (redirect URI of the OAuth client)
      path: '/auth/google',
      name: 'google-callback',
      component: () => import('@/views/GoogleCallbackView.vue'),
      meta: { public: true, title: 'Entrando con Google' },
    },
    {
      path: '/registro',
      name: 'signup',
      component: () => import('@/views/SignupView.vue'),
      meta: { public: true, guest: true, title: 'Crea la cuenta de tu conjunto' },
    },
    {
      path: '/recuperar-contrasena',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPasswordView.vue'),
      meta: { public: true, guest: true, title: 'Recuperar contraseña' },
    },
    {
      // Links sent by email: they work with or without a session
      path: '/restablecer-contrasena',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
      meta: { public: true, title: 'Nueva contraseña' },
    },
    {
      path: '/invitacion',
      name: 'invitation',
      component: () => import('@/views/AcceptInvitationView.vue'),
      meta: { public: true, title: 'Invitación' },
    },
    {
      path: '/verificar-correo',
      name: 'verify-email',
      component: () => import('@/views/VerifyEmailView.vue'),
      meta: { public: true, title: 'Confirmación de correo' },
    },
    {
      path: '/conjuntos',
      name: 'select-tenant',
      component: () => import('@/views/SelectTenantView.vue'),
      meta: { title: 'Selecciona un conjunto' },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { tenant: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { tenant: true, title: 'Inicio' },
        },
        {
          path: 'torres',
          name: 'buildings',
          component: () => import('@/views/BuildingsView.vue'),
          meta: { tenant: true, title: 'Torres' },
        },
        {
          path: 'unidades',
          name: 'units',
          component: () => import('@/views/UnitsView.vue'),
          meta: { tenant: true, title: 'Unidades' },
        },
        {
          path: 'unidades/:id',
          name: 'unit',
          component: () => import('@/views/UnitDetailView.vue'),
          meta: { tenant: true, title: 'Unidad' },
        },
        {
          path: 'personas',
          name: 'members',
          component: () => import('@/views/MembersView.vue'),
          meta: { tenant: true, title: 'Personas' },
        },
        {
          path: 'comunicados',
          name: 'announcements',
          component: () => import('@/views/AnnouncementsView.vue'),
          meta: { tenant: true, title: 'Comunicados' },
        },
        {
          path: 'pqrs',
          name: 'tickets',
          component: () => import('@/views/TicketsView.vue'),
          meta: { tenant: true, tickets: true, title: 'PQRS' },
        },
        {
          path: 'encuestas',
          name: 'surveys',
          component: () => import('@/views/surveys/SurveysView.vue'),
          meta: { tenant: true, surveys: true, title: 'Encuestas' },
        },
        {
          path: 'encuestas/:id',
          name: 'survey',
          component: () => import('@/views/surveys/SurveyView.vue'),
          meta: { tenant: true, surveys: true, title: 'Encuesta' },
        },
        {
          path: 'documentos',
          name: 'documents',
          component: () => import('@/views/documents/DocumentsView.vue'),
          meta: { tenant: true, title: 'Documentos' },
        },
        {
          path: 'zonas-comunes',
          name: 'amenities',
          component: () => import('@/views/amenities/BookingsView.vue'),
          meta: { tenant: true, amenities: true, title: 'Zonas comunes' },
        },
        {
          path: 'zonas-comunes/configuracion',
          name: 'amenities-settings',
          component: () => import('@/views/amenities/AmenitiesView.vue'),
          meta: { tenant: true, manage: true, title: 'Configuración de zonas comunes' },
        },
        {
          path: 'parqueaderos',
          name: 'parking',
          component: () => import('@/views/parking/SpotsView.vue'),
          meta: { tenant: true, spots: true, title: 'Parqueaderos' },
        },
        {
          path: 'parqueaderos/configuracion',
          name: 'parking-settings',
          component: () => import('@/views/parking/SpotsSettingsView.vue'),
          meta: { tenant: true, manage: true, title: 'Configuración de parqueaderos' },
        },
        {
          path: 'parqueaderos/sorteos',
          name: 'parking-lotteries',
          component: () => import('@/views/parking/LotteriesView.vue'),
          meta: { tenant: true, lotteries: true, title: 'Sorteos de parqueaderos' },
        },
        {
          path: 'parqueaderos/sorteos/:id',
          name: 'parking-lottery',
          component: () => import('@/views/parking/LotteryView.vue'),
          meta: { tenant: true, lotteries: true, title: 'Sorteo de parqueaderos' },
        },
        {
          path: 'parqueadero',
          name: 'visitor-parking',
          component: () => import('@/views/parking/ParkingView.vue'),
          meta: { tenant: true, parking: true, title: 'Parqueadero de visitantes' },
        },
        {
          path: 'parqueadero/configuracion',
          name: 'visitor-parking-settings',
          component: () => import('@/views/parking/ParkingSettingsView.vue'),
          meta: { tenant: true, manage: true, title: 'Configuración del parqueadero' },
        },
        {
          path: 'reportes',
          name: 'reports',
          component: () => import('@/views/reports/ReportsView.vue'),
          meta: { tenant: true, reports: true, title: 'Reportes' },
        },
        {
          path: 'reportes/:key',
          name: 'report',
          component: () => import('@/views/reports/ReportView.vue'),
          meta: { tenant: true, reports: true, title: 'Reporte' },
        },
        {
          path: 'auditoria',
          name: 'audit',
          component: () => import('@/views/reports/AuditLogView.vue'),
          meta: { tenant: true, audit: true, title: 'Auditoría' },
        },
        {
          path: 'finanzas',
          component: () => import('@/layouts/FinanceLayout.vue'),
          meta: { tenant: true, finance: true },
          children: [
            {
              path: '',
              name: 'finance',
              component: () => import('@/views/finance/FinanceSummaryView.vue'),
              meta: { tenant: true, finance: true, title: 'Finanzas' },
            },
            {
              path: 'facturacion',
              name: 'finance-billing',
              component: () => import('@/views/finance/BillingView.vue'),
              meta: { tenant: true, finance: true, title: 'Facturación' },
            },
            {
              path: 'tarifas',
              name: 'finance-fees',
              component: () => import('@/views/finance/FeesView.vue'),
              meta: { tenant: true, finance: true, title: 'Tarifas y cuotas' },
            },
            {
              path: 'recaudo',
              name: 'finance-payments',
              component: () => import('@/views/finance/PaymentsView.vue'),
              meta: { tenant: true, finance: true, title: 'Recaudo' },
            },
            {
              path: 'cartera',
              name: 'finance-receivables',
              component: () => import('@/views/finance/ReceivablesView.vue'),
              meta: { tenant: true, finance: true, title: 'Cartera' },
            },
            {
              path: 'cartera/:unitId',
              name: 'finance-statement',
              component: () => import('@/views/finance/UnitStatementView.vue'),
              meta: { tenant: true, finance: true, title: 'Estado de cuenta' },
            },
            {
              path: 'gastos',
              name: 'finance-expenses',
              component: () => import('@/views/finance/ExpensesView.vue'),
              meta: { tenant: true, finance: true, title: 'Gastos y proveedores' },
            },
            {
              path: 'bancos',
              name: 'finance-banks',
              component: () => import('@/views/finance/BanksView.vue'),
              meta: { tenant: true, finance: true, title: 'Bancos y caja' },
            },
            {
              path: 'conciliacion',
              name: 'finance-reconciliation',
              component: () => import('@/views/finance/ReconciliationView.vue'),
              meta: { tenant: true, finance: true, title: 'Conciliación bancaria' },
            },
            {
              path: 'conciliacion/:id',
              name: 'finance-reconciliation-statement',
              component: () => import('@/views/finance/BankStatementView.vue'),
              meta: { tenant: true, finance: true, title: 'Extracto bancario' },
            },
            {
              path: 'presupuesto',
              name: 'finance-budgets',
              component: () => import('@/views/finance/BudgetsView.vue'),
              meta: { tenant: true, finance: true, title: 'Presupuesto' },
            },
            {
              path: 'presupuesto/:id',
              name: 'finance-budget',
              component: () => import('@/views/finance/BudgetDetailView.vue'),
              meta: { tenant: true, finance: true, title: 'Presupuesto' },
            },
            {
              path: 'contabilidad',
              name: 'finance-accounting',
              component: () => import('@/views/finance/AccountingView.vue'),
              meta: { tenant: true, finance: true, title: 'Contabilidad' },
            },
            {
              path: 'informes',
              name: 'finance-reports',
              component: () => import('@/views/finance/ReportsView.vue'),
              meta: { tenant: true, finance: true, title: 'Informes contables' },
            },
            {
              path: 'configuracion',
              name: 'finance-settings',
              component: () => import('@/views/finance/FinanceSettingsView.vue'),
              meta: { tenant: true, finance: true, title: 'Configuración financiera' },
            },
          ],
        },
        {
          path: 'perfil',
          name: 'profile',
          component: () => import('@/views/ProfileView.vue'),
          meta: { tenant: true, title: 'Mi perfil' },
        },
        {
          path: 'configuracion',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { tenant: true, title: 'Configuración del conjunto' },
        },
        {
          path: 'importar',
          name: 'import',
          component: () => import('@/views/ImportView.vue'),
          meta: { tenant: true, manage: true, title: 'Importar datos' },
        },
        {
          path: 'plan',
          name: 'plan',
          component: () => import('@/views/PlanView.vue'),
          meta: { tenant: true, title: 'Plan y facturación' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { public: true, title: 'Página no encontrada' },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.guest && auth.isAuthenticated) return { path: '/' }
  if (to.meta.public) return true

  if (!auth.isAuthenticated) {
    return { name: 'login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
  }

  const tenant = useTenantStore()
  if (!tenant.loaded) {
    try {
      await Promise.all([auth.user ? null : auth.loadProfile(), tenant.load()])
    } catch {
      return auth.isAuthenticated ? true : { name: 'login' }
    }
  }

  if (to.meta.tenant && !tenant.current) {
    return { name: 'select-tenant', query: { redirect: to.fullPath } }
  }
  if (to.meta.finance && !tenant.canReadFinance) return { name: 'dashboard' }
  if (to.meta.manage && !tenant.canManage) return { name: 'dashboard' }
  if (to.meta.tickets && !tenant.canReadTickets) return { name: 'dashboard' }
  if (to.meta.parking && !tenant.canUseVisitorParking) return { name: 'dashboard' }
  if (to.meta.spots && !tenant.canReadParking) return { name: 'dashboard' }
  if (to.meta.lotteries && !tenant.canReadParkingLotteries) return { name: 'dashboard' }
  if (to.meta.amenities && !tenant.canReadAmenities) return { name: 'dashboard' }
  if (to.meta.surveys && !tenant.canReadSurveys) return { name: 'dashboard' }
  if (to.meta.reports && !tenant.canReadReports) return { name: 'dashboard' }
  if (to.meta.audit && !tenant.canReadAudit) return { name: 'dashboard' }

  if (tenant.current) {
    // The trial banner is informative: never block navigation if it fails
    await useSubscriptionStore()
      .load(tenant.current.id)
      .catch(() => undefined)
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · AptoPH` : 'AptoPH · Administración'
})

export default router
