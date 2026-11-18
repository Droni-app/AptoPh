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
    title?: string
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true, guest: true, title: 'Iniciar sesión' },
    },
    {
      path: '/registro',
      name: 'signup',
      component: () => import('@/views/SignupView.vue'),
      meta: { public: true, guest: true, title: 'Crea la cuenta de tu conjunto' },
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
