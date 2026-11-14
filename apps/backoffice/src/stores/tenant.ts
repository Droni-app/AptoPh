import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { BACKOFFICE_ROLES, type EnrollmentRole, type TenantSummary } from '@apartadock/shared'
import { api } from '@/lib/http'

const CURRENT_KEY = 'apartadock.backoffice.tenant'

function readCurrent() {
  try {
    return localStorage.getItem(CURRENT_KEY)
  } catch {
    return null
  }
}

/**
 * Tenants (conjuntos) the user can manage from the back-office and the active one
 */
export const useTenantStore = defineStore('tenant', () => {
  const tenants = ref<TenantSummary[]>([])
  const loaded = ref(false)
  const currentId = ref<string | null>(readCurrent())

  /** Only tenants where the user has a back-office role */
  const backofficeTenants = computed(() =>
    tenants.value.filter((tenant) => tenant.roles.some((role) => BACKOFFICE_ROLES.includes(role))),
  )

  const current = computed(
    () => backofficeTenants.value.find((tenant) => tenant.id === currentId.value) ?? null,
  )

  const roles = computed<EnrollmentRole[]>(() => current.value?.roles ?? [])
  const hasRole = (...wanted: EnrollmentRole[]) => roles.value.some((role) => wanted.includes(role))
  const canManage = computed(() => hasRole('administrator'))

  async function load() {
    const { data } = await api<{ data: TenantSummary[] }>('/api/v1/account/tenants', { tenant: false })
    tenants.value = data
    loaded.value = true

    if (currentId.value && !current.value) select(null)
    if (!currentId.value && backofficeTenants.value.length === 1) {
      select(backofficeTenants.value[0]!.id)
    }
  }

  function select(id: string | null) {
    currentId.value = id
    try {
      if (id) localStorage.setItem(CURRENT_KEY, id)
      else localStorage.removeItem(CURRENT_KEY)
    } catch {
      // ignore
    }
  }

  function reset() {
    tenants.value = []
    loaded.value = false
  }

  return { tenants, loaded, currentId, backofficeTenants, current, roles, hasRole, canManage, load, select, reset }
})
