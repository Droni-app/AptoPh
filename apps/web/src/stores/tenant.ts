import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { EnrollmentRole, type TenantSummary } from '@aptoph/shared'
import { api } from '@/lib/http'

const CURRENT_KEY = 'aptoph.web.tenant'

function readCurrent() {
  try {
    return localStorage.getItem(CURRENT_KEY)
  } catch {
    return null
  }
}

/**
 * Conjuntos where the user is a resident, and the active one (sent as X-Tenant-Id)
 */
export const useTenantStore = defineStore('tenant', () => {
  const tenants = ref<TenantSummary[]>([])
  const loaded = ref(false)
  const currentId = ref<string | null>(readCurrent())

  const residentTenants = computed(() =>
    tenants.value.filter((tenant) => tenant.roles.includes(EnrollmentRole.Resident)),
  )

  const current = computed(
    () => residentTenants.value.find((tenant) => tenant.id === currentId.value) ?? null,
  )

  async function load() {
    const { data } = await api<{ data: TenantSummary[] }>('/api/v1/account/tenants', {
      tenant: false,
    })
    tenants.value = data
    loaded.value = true

    if (currentId.value && !current.value) select(null)
    if (!currentId.value && residentTenants.value.length === 1) {
      select(residentTenants.value[0]!.id)
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

  return { tenants, loaded, currentId, residentTenants, current, load, select, reset }
})
