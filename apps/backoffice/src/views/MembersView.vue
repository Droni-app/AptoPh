<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { DuiAlert, DuiBadge, DuiTable, DuiTabs, type TableColumn } from '@dronico/droni-kit'
import {
  ENROLLMENT_STATUS_LABELS,
  ROLE_LABELS,
  type ApiPaginated,
  type Member,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { membersApi } from '@/api/backoffice'
import { errorMessage } from '@/lib/errors'

type Group = 'staff' | 'residents'

const group = ref<Group>('staff')
const page = ref(1)
const result = ref<ApiPaginated<Member> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const tabs = [
  { label: 'Administración y personal', value: 'staff', icon: 'mdi mdi-badge-account-outline' },
  { label: 'Residentes', value: 'residents', icon: 'mdi mdi-home-account' },
]

const columns: TableColumn[] = [
  { name: 'name', label: 'Nombre' },
  { name: 'role', label: 'Rol' },
  { name: 'contact', label: 'Contacto' },
  { name: 'status', label: 'Estado', classes: 'w-32' },
]

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

async function load() {
  loading.value = true
  try {
    result.value = await membersApi.list({ group: group.value, page: page.value, perPage: 25 })
    error.value = null
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

watch(group, () => {
  page.value = 1
  load()
})

function paginate(value: number) {
  page.value = value
  load()
}

onMounted(load)
</script>

<template>
  <PageHeader title="Personas" subtitle="Quiénes tienen acceso al conjunto y con qué rol" />

  <DuiTabs v-model="group" :tabs="tabs" class="mb-4" aria-label="Grupo" />

  <DuiAlert v-if="error" color="danger" variant="soft" class="mb-4">{{ error }}</DuiAlert>

  <DuiTable
    :columns="columns"
    :rows="result?.data ?? []"
    :loading="loading"
    :pagination="pagination"
    @paginate="paginate"
  >
    <template #name="{ user }">
      <span class="font-medium">{{ user?.fullName ?? '—' }}</span>
    </template>
    <template #role="{ role, title }">
      <span class="block">{{ ROLE_LABELS[role as Member['role']] }}</span>
      <span v-if="title" class="block text-neutral-500">{{ title }}</span>
    </template>
    <template #contact="{ user }">
      <span class="block">{{ user?.email }}</span>
      <span class="block text-neutral-500">{{ user?.phone ?? '' }}</span>
    </template>
    <template #status="{ status }">
      <DuiBadge
        :label="ENROLLMENT_STATUS_LABELS[status as Member['status']]"
        :color="statusColor[status as Member['status']]"
        variant="soft"
        size="sm"
      />
    </template>
    <template #empty><EmptyState title="No hay personas en este grupo" /></template>
  </DuiTable>
</template>
