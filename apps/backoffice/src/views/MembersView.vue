<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiDropdown,
  UiDropdownItem,
  UiDropdownSeparator,
  UiInput,
  UiSelect,
  UiTable,
  UiTabs,
  useToast,
  type TableColumn,
} from '@aptoph/ui'
import {
  ENROLLMENT_STATUS_LABELS,
  ROLE_LABELS,
  type ApiPaginated,
  type EnrollmentStatus,
  type Member,
  type MemberStatusChange,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import MemberFormModal from '@/components/MemberFormModal.vue'
import { membersApi } from '@/api/backoffice'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { errorMessage } from '@/lib/errors'

type Group = 'staff' | 'residents'

const auth = useAuthStore()
const tenant = useTenantStore()
const toast = useToast()

const group = ref<Group>('staff')
const status = ref<EnrollmentStatus | ''>('')
const search = ref('')
const page = ref(1)
const result = ref<ApiPaginated<Member> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const formOpen = ref(false)
const editing = ref<Member | null>(null)
const confirm = ref<{ member: Member; status: MemberStatusChange } | null>(null)
const confirmOpen = ref(false)
const busy = ref(false)

const tabs = [
  { label: 'Administración y personal', value: 'staff', icon: 'mdi mdi-badge-account-outline' },
  { label: 'Residentes', value: 'residents', icon: 'mdi mdi-home-account' },
]

const statusOptions = [
  { value: '', label: 'Con acceso o invitados' },
  { value: 'active', label: 'Activos' },
  { value: 'invited', label: 'Invitación pendiente' },
  { value: 'suspended', label: 'Suspendidos' },
  { value: 'revoked', label: 'Retirados' },
]

const columns = computed<TableColumn[]>(() => [
  { name: 'name', label: 'Nombre' },
  { name: 'role', label: 'Rol' },
  { name: 'contact', label: 'Contacto' },
  { name: 'status', label: 'Estado', classes: 'w-44' },
  ...(tenant.canManage ? [{ name: 'actions', label: '', classes: 'w-14 text-right' }] : []),
])

const statusColor = {
  active: 'success',
  invited: 'warning',
  suspended: 'danger',
  revoked: 'neutral',
} as const

const pagination = computed(() =>
  result.value
    ? {
        page: result.value.metadata.currentPage,
        perPage: result.value.metadata.perPage,
        total: result.value.metadata.total,
      }
    : undefined,
)

const confirmText = computed(() => {
  if (!confirm.value) return { title: '', message: '', label: '' }
  const { member, status: next } = confirm.value
  const name = member.user?.fullName ?? 'esta persona'
  const role = ROLE_LABELS[member.role].toLowerCase()
  if (next === 'suspended')
    return {
      title: 'Suspender acceso',
      message: `${name} no podrá entrar como ${role} hasta que reactives su acceso.`,
      label: 'Suspender',
    }
  if (member.status === 'invited')
    return {
      title: 'Cancelar invitación',
      message: `El enlace que recibió ${name} dejará de funcionar.`,
      label: 'Cancelar invitación',
    }
  return {
    title: 'Retirar acceso',
    message: `${name} dejará de tener el rol ${role} en el conjunto. Para devolverle el acceso tendrás que invitarla de nuevo.`,
    label: 'Retirar',
  }
})

const dateFormat = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' })
const shortDate = (value: string | null) => (value ? dateFormat.format(new Date(value)) : '')

async function load() {
  loading.value = true
  try {
    result.value = await membersApi.list({
      group: group.value,
      status: status.value,
      search: search.value.trim() || undefined,
      page: page.value,
      perPage: 25,
    })
    error.value = null
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})

watch([group, status], () => {
  page.value = 1
  load()
})

function paginate(value: number) {
  page.value = value
  load()
}

function openForm(member: Member | null) {
  editing.value = member
  formOpen.value = true
}

function ask(member: Member, next: MemberStatusChange) {
  confirm.value = { member, status: next }
  confirmOpen.value = true
}

async function changeStatus(member: Member, next: MemberStatusChange) {
  busy.value = true
  try {
    await membersApi.changeStatus(member.id, next)
    toast.success(
      next === 'active'
        ? 'Acceso reactivado'
        : next === 'suspended'
          ? 'Acceso suspendido'
          : member.status === 'invited'
            ? 'Invitación cancelada'
            : 'Acceso retirado',
    )
    confirmOpen.value = false
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function resend(member: Member) {
  try {
    await membersApi.resendInvitation(member.id)
    toast.success(`Reenviamos la invitación a ${member.user?.email}`)
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

const isMe = (member: Member) => member.user?.id === auth.user?.id

onMounted(load)
</script>

<template>
  <PageHeader title="Personas" subtitle="Quiénes tienen acceso al conjunto y con qué rol">
    <template #actions>
      <UiButton v-if="tenant.canManage" color="primary" @click="openForm(null)">
        <span class="mdi mdi-account-plus-outline mr-1" aria-hidden="true" />Invitar
      </UiButton>
    </template>
  </PageHeader>

  <UiTabs v-model="group" :tabs="tabs" class="mb-4" aria-label="Grupo" />

  <div class="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
    <UiInput
      v-model="search"
      type="search"
      placeholder="Buscar por nombre o correo"
      aria-label="Buscar por nombre o correo"
      block
    />
    <UiSelect v-model="status" :options="statusOptions" aria-label="Estado" block />
  </div>

  <UiAlert v-if="error" color="danger" variant="soft" class="mb-4">{{ error }}</UiAlert>

  <UiTable
    :columns="columns"
    :rows="result?.data ?? []"
    :loading="loading"
    :pagination="pagination"
    @paginate="paginate"
  >
    <template #name="row">
      <span class="font-medium">{{ row.user?.fullName ?? '—' }}</span>
      <span v-if="isMe(row as Member)" class="ml-1 text-xs text-neutral-500">(tú)</span>
    </template>
    <template #role="{ role, title, endsOn }">
      <span class="block">{{ ROLE_LABELS[role as Member['role']] }}</span>
      <span v-if="title" class="block text-neutral-500">{{ title }}</span>
      <span v-if="endsOn" class="block text-xs text-neutral-500">Hasta {{ endsOn }}</span>
    </template>
    <template #contact="{ user }">
      <span class="block">{{ user?.email }}</span>
      <span class="block text-neutral-500">{{ user?.phone ?? '' }}</span>
    </template>
    <template #status="row">
      <UiBadge
        :label="ENROLLMENT_STATUS_LABELS[row.status as Member['status']]"
        :color="statusColor[row.status as Member['status']]"
        variant="soft"
        size="sm"
      />
      <span
        v-if="row.status === 'invited'"
        class="mt-1 block text-xs"
        :class="row.invitationExpired ? 'text-red-600 dark:text-red-300' : 'text-neutral-500'"
      >
        {{
          row.invitationExpired
            ? 'El enlace venció'
            : `Enviada el ${shortDate(row.invitationSentAt)}`
        }}
      </span>
    </template>
    <template #actions="row">
      <UiDropdown
        v-if="!isMe(row as Member) && row.status !== 'revoked'"
        placement="bottom-end"
        min-width="14rem"
        :aria-label="`Acciones para ${row.user?.fullName}`"
      >
        <template #trigger>
          <span class="grid size-8 place-items-center rounded-lg text-lg text-neutral-500">
            <i class="mdi mdi-dots-vertical" aria-hidden="true" />
          </span>
        </template>
        <UiDropdownItem
          icon="mdi mdi-pencil-outline"
          label="Editar cargo y fechas"
          @click="openForm(row as Member)"
        />
        <UiDropdownItem
          v-if="row.status === 'invited'"
          icon="mdi mdi-email-fast-outline"
          label="Reenviar invitación"
          @click="resend(row as Member)"
        />
        <UiDropdownItem
          v-if="row.status === 'active'"
          icon="mdi mdi-account-cancel-outline"
          label="Suspender acceso"
          @click="ask(row as Member, 'suspended')"
        />
        <UiDropdownItem
          v-if="row.status === 'suspended'"
          icon="mdi mdi-account-check-outline"
          label="Reactivar acceso"
          @click="changeStatus(row as Member, 'active')"
        />
        <UiDropdownSeparator />
        <UiDropdownItem
          icon="mdi mdi-account-remove-outline"
          :label="row.status === 'invited' ? 'Cancelar invitación' : 'Retirar acceso'"
          danger
          @click="ask(row as Member, 'revoked')"
        />
      </UiDropdown>
    </template>
    <template #empty>
      <EmptyState
        :title="search ? 'Nadie coincide con la búsqueda' : 'No hay personas en este grupo'"
        :description="
          tenant.canManage && !search
            ? 'Invita al consejo, al personal y a los residentes para que entren a AptoPH.'
            : undefined
        "
      >
        <UiButton v-if="tenant.canManage && !search" color="primary" @click="openForm(null)">
          Invitar a una persona
        </UiButton>
      </EmptyState>
    </template>
  </UiTable>

  <MemberFormModal
    v-model="formOpen"
    :member="editing"
    :preset="group === 'residents' ? { role: 'resident' } : undefined"
    @saved="load"
  />
  <ConfirmDialog
    v-model="confirmOpen"
    :title="confirmText.title"
    :message="confirmText.message"
    :confirm-label="confirmText.label"
    :loading="busy"
    @confirm="confirm && changeStatus(confirm.member, confirm.status)"
  />
</template>
