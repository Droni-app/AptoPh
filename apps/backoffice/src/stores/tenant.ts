import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  BACKOFFICE_ROLES,
  FINANCE_READ_ROLES,
  FINANCE_WRITE_ROLES,
  ANNOUNCEMENT_WRITE_ROLES,
  TICKET_MANAGE_ROLES,
  TICKET_READ_ROLES,
  TICKET_WORK_ROLES,
  VISITOR_PARKING_ADMIN_ROLES,
  PARKING_MANAGE_ROLES,
  PARKING_READ_ROLES,
  VISITOR_PARKING_ROLES,
  type EnrollmentRole,
  type TenantSummary,
  AMENITY_MANAGE_ROLES,
  AMENITY_READ_ROLES,
  SURVEY_READ_ROLES,
} from '@aptoph/shared'
import { api } from '@/lib/http'

const CURRENT_KEY = 'aptoph.backoffice.tenant'

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
  const canReadFinance = computed(() => hasRole(...FINANCE_READ_ROLES))
  const canManageFinance = computed(() => hasRole(...FINANCE_WRITE_ROLES))
  const canManageAnnouncements = computed(() => hasRole(...ANNOUNCEMENT_WRITE_ROLES))
  /** PQRS: staff only see (and work on) the ones assigned to them */
  const canReadTickets = computed(() => hasRole(...TICKET_READ_ROLES))
  const canWorkTickets = computed(() => hasRole(...TICKET_WORK_ROLES))
  const canManageTickets = computed(() => hasRole(...TICKET_MANAGE_ROLES))
  /** Visitor parking: administration and guards; only the administration configures it */
  const canUseVisitorParking = computed(() => hasRole(...VISITOR_PARKING_ROLES))
  const canConfigureVisitorParking = computed(() => hasRole(...VISITOR_PARKING_ADMIN_ROLES))
  /** Parking of the conjunto: the council and the guards consult it */
  const canReadParking = computed(() => hasRole(...PARKING_READ_ROLES))
  const canManageParking = computed(() => hasRole(...PARKING_MANAGE_ROLES))
  /** The lottery: administration and council (not the guards) */
  const canReadParkingLotteries = computed(() => hasRole('administrator', 'council_member'))
  /** Common areas: the calendar for staff and guards; the administration manages them */
  const canReadAmenities = computed(() => hasRole(...AMENITY_READ_ROLES))
  /** Surveys: administration, council and fiscal reviewer follow the results */
  const canReadSurveys = computed(() => hasRole(...SURVEY_READ_ROLES))
  const canManageAmenities = computed(() => hasRole(...AMENITY_MANAGE_ROLES))
  /** Sees every ticket (not only the assigned ones) */
  const seesAllTickets = computed(() => hasRole('administrator', 'council_member'))

  async function load() {
    const { data } = await api<{ data: TenantSummary[] }>('/api/v1/account/tenants', {
      tenant: false,
    })
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

  return {
    tenants,
    loaded,
    currentId,
    backofficeTenants,
    current,
    roles,
    hasRole,
    canManage,
    canReadFinance,
    canManageFinance,
    canManageAnnouncements,
    canReadTickets,
    canWorkTickets,
    canManageTickets,
    seesAllTickets,
    canUseVisitorParking,
    canConfigureVisitorParking,
    canReadParking,
    canManageParking,
    canReadParkingLotteries,
    canReadAmenities,
    canReadSurveys,
    canManageAmenities,
    load,
    select,
    reset,
  }
})
