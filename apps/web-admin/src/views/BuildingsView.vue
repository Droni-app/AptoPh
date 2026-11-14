<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { DuiAlert, DuiButton, DuiTable, useToast, type TableColumn } from '@dronico/droni-kit'
import type { Building } from '@apartadock/shared'
import PageHeader from '@/components/PageHeader.vue'
import BuildingFormModal from '@/components/BuildingFormModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { buildingsApi } from '@/api/backoffice'
import { errorMessage } from '@/lib/errors'
import { useTenantStore } from '@/stores/tenant'

const tenant = useTenantStore()
const toast = useToast()

const buildings = ref<Building[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const formOpen = ref(false)
const editing = ref<Building | null>(null)
const deleting = ref<Building | null>(null)
const deleteOpen = ref(false)
const removing = ref(false)

const columns: TableColumn[] = [
  { name: 'name', label: 'Nombre' },
  { name: 'floors', label: 'Pisos', classes: 'w-24' },
  { name: 'unitsCount', label: 'Unidades', classes: 'w-28' },
  ...(tenant.canManage ? [{ name: 'actions', label: '', classes: 'w-32 text-right' }] : []),
]

async function load() {
  loading.value = true
  try {
    buildings.value = (await buildingsApi.list()).data
    error.value = null
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

function openForm(building: Building | null) {
  editing.value = building
  formOpen.value = true
}

function askDelete(building: Building) {
  deleting.value = building
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleting.value) return
  removing.value = true
  try {
    await buildingsApi.remove(deleting.value.id)
    toast.success('Torre eliminada')
    deleteOpen.value = false
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    removing.value = false
  }
}

onMounted(load)
</script>

<template>
  <PageHeader title="Torres" subtitle="Torres, bloques o etapas del conjunto">
    <template #actions>
      <DuiButton v-if="tenant.canManage" color="primary" @click="openForm(null)">
        <span class="mdi mdi-plus mr-1" aria-hidden="true" />Nueva torre
      </DuiButton>
    </template>
  </PageHeader>

  <DuiAlert v-if="error" color="danger" variant="soft" class="mb-4">{{ error }}</DuiAlert>

  <DuiTable :columns="columns" :rows="buildings" :loading="loading">
    <template #floors="{ floors }">{{ floors ?? '—' }}</template>
    <template #unitsCount="{ id, unitsCount }">
      <RouterLink :to="{ name: 'units', query: { buildingId: id } }" class="text-violet-600 hover:underline dark:text-violet-300">
        {{ unitsCount ?? 0 }}
      </RouterLink>
    </template>
    <template #actions="row">
      <div class="flex justify-end gap-1">
        <DuiButton variant="ghost" size="sm" :aria-label="`Editar ${row.name}`" @click="openForm(row as Building)">
          <span class="mdi mdi-pencil-outline" />
        </DuiButton>
        <DuiButton
          variant="ghost"
          color="danger"
          size="sm"
          :aria-label="`Eliminar ${row.name}`"
          @click="askDelete(row as Building)"
        >
          <span class="mdi mdi-trash-can-outline" />
        </DuiButton>
      </div>
    </template>
    <template #empty>Aún no hay torres registradas.</template>
  </DuiTable>

  <BuildingFormModal v-model="formOpen" :building="editing" @saved="load" />
  <ConfirmDialog
    v-model="deleteOpen"
    title="Eliminar torre"
    :message="`¿Eliminar ${deleting?.name}? Solo es posible si no tiene unidades.`"
    :loading="removing"
    @confirm="confirmDelete"
  />
</template>
