import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'

declare module 'vue-router' {
  interface RouteMeta {
    /** Accessible without a session */
    public?: boolean
    /** Login: a signed-in user goes straight to the app */
    guest?: boolean
    /** Requires an active conjunto (X-Tenant-Id) */
    tenant?: boolean
    title?: string
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true, guest: true, title: 'Iniciar sesión' },
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
      meta: { title: 'Selecciona tu conjunto' },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { tenant: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
          meta: { tenant: true, title: 'Inicio' },
        },
        {
          path: 'unidades/:id',
          name: 'unit',
          component: () => import('@/views/UnitView.vue'),
          meta: { tenant: true, title: 'Mi unidad' },
        },
        {
          path: 'porteria',
          name: 'visits',
          component: () => import('@/views/VisitsView.vue'),
          meta: { tenant: true, title: 'Portería' },
        },
        {
          path: 'reservas',
          name: 'bookings',
          component: () => import('@/views/BookingsView.vue'),
          meta: { tenant: true, title: 'Reservas' },
        },
        {
          path: 'comunicados',
          name: 'announcements',
          component: () => import('@/views/AnnouncementsView.vue'),
          meta: { tenant: true, title: 'Comunicados' },
        },
        {
          path: 'comunicados/:id',
          name: 'announcement',
          component: () => import('@/views/AnnouncementView.vue'),
          meta: { tenant: true, title: 'Comunicados' },
        },
        {
          path: 'pqrs',
          name: 'tickets',
          component: () => import('@/views/TicketsView.vue'),
          meta: { tenant: true, title: 'PQRS' },
        },
        {
          path: 'pqrs/:id',
          name: 'ticket',
          component: () => import('@/views/TicketView.vue'),
          meta: { tenant: true, title: 'PQRS' },
        },
        {
          path: 'perfil',
          name: 'profile',
          component: () => import('@/views/ProfileView.vue'),
          meta: { tenant: true, title: 'Mi perfil' },
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
    return { name: 'select-tenant', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · AptoPH` : 'AptoPH · Residentes'
})

export default router
