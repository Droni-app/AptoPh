<script setup lang="ts">
import { computed } from 'vue'
import { UiBadge, UiButton } from '@aptoph/ui'
import {
  IMPORT_COLUMNS,
  OCCUPANT_RELATIONSHIP_LABELS,
  type ImportAction,
  type ImportPlanRow,
} from '@aptoph/shared'

/** One row of the import preview, with its own import and discard buttons */
export type RowState = 'pending' | 'importing' | 'imported' | 'discarded' | 'failed'

const props = defineProps<{
  row: ImportPlanRow
  state: RowState
  failure?: string | null
  /** Another import is running (import all) */
  busy?: boolean
}>()
const emit = defineEmits<{ import: []; discard: []; restore: [] }>()

const labels = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c.field, c.label]))

const status = computed(() => {
  if (props.state === 'imported')
    return { label: 'Importado', color: 'success' as const, icon: 'mdi-check' }
  if (props.state === 'discarded')
    return { label: 'Descartado', color: 'neutral' as const, icon: 'mdi-close' }
  return {
    create: { label: 'Nuevo', color: 'success' as const, icon: 'mdi-plus' },
    update: { label: 'Actualiza', color: 'warning' as const, icon: 'mdi-pencil' },
    unchanged: { label: 'Sin cambios', color: 'neutral' as const, icon: 'mdi-equal' },
    error: { label: 'Con errores', color: 'danger' as const, icon: 'mdi-alert-circle-outline' },
  }[props.row.status]
})

const title = computed(() => {
  const input = props.row.input
  if (!input) return `Fila ${props.row.line}`
  return input.code || 'Sin código'
})

/** What happens to each part, in words */
const verbs: Record<ImportAction, string> = {
  create: 'se crea',
  update: 'se actualiza',
  unchanged: 'sin cambios',
  none: '',
}
const parts = computed(() => {
  const row = props.row
  const list: Array<{ icon: string; text: string; action: ImportAction | 'create' }> = []
  if (row.building.action === 'create')
    list.push({
      icon: 'mdi-office-building-outline',
      text: `Torre «${row.building.name}»`,
      action: 'create',
    })
  list.push({ icon: 'mdi-door', text: 'Unidad', action: row.unit.action })
  if (row.person.action !== 'none')
    list.push({
      icon: 'mdi-account-outline',
      text: row.input?.fullName ?? 'Persona',
      action: row.person.action,
    })
  return list
})
const changes = computed(() => [...props.row.unit.changes, ...props.row.person.changes])
const importable = computed(
  () =>
    (props.state === 'pending' || props.state === 'failed') &&
    ['create', 'update'].includes(props.row.status),
)
const dimmed = computed(() => props.state === 'imported' || props.state === 'discarded')
</script>

<template>
  <li
    class="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start"
    :class="dimmed && 'bg-neutral-50/70 dark:bg-white/2'"
  >
    <div class="min-w-0 flex-1" :class="dimmed && 'opacity-60'">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="text-xs text-neutral-400 tabular-nums">Fila {{ row.line }}</span>
        <span class="font-semibold text-neutral-900 dark:text-white">{{ title }}</span>
        <span v-if="row.input?.building" class="text-sm text-neutral-500">{{
          row.input.building
        }}</span>
        <UiBadge :color="status.color" :icon="status.icon" size="xs">{{ status.label }}</UiBadge>
      </div>

      <p v-if="row.input?.fullName" class="mt-0.5 text-sm text-neutral-700 dark:text-neutral-200">
        {{ row.input.fullName }}
        <span v-if="row.input.relationship" class="text-neutral-500"
          >({{ OCCUPANT_RELATIONSHIP_LABELS[row.input.relationship] }})</span
        >
      </p>

      <ul
        v-if="row.status !== 'error' && state !== 'imported'"
        class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500"
      >
        <li v-for="part in parts" :key="part.text" class="flex items-center gap-1">
          <span :class="['mdi', part.icon]" aria-hidden="true" />
          {{ part.text }}:
          <span
            :class="
              part.action === 'create'
                ? 'font-medium text-mint-700 dark:text-mint-300'
                : part.action === 'update'
                  ? 'font-medium text-amber-700 dark:text-amber-300'
                  : ''
            "
            >{{ verbs[part.action] }}</span
          >
        </li>
      </ul>

      <dl
        v-if="changes.length && state !== 'imported'"
        class="mt-2 grid gap-1 text-sm sm:grid-cols-[max-content_1fr] sm:gap-x-3"
      >
        <template v-for="change in changes" :key="change.field">
          <dt class="text-neutral-500">{{ change.label }}</dt>
          <dd class="min-w-0 break-words">
            <span class="text-neutral-400 line-through">{{ change.from ?? 'vacío' }}</span>
            <span class="mdi mdi-arrow-right mx-1 text-neutral-400" aria-label="cambia a" />
            <span class="font-medium text-neutral-900 dark:text-white">{{
              change.to ?? 'vacío'
            }}</span>
          </dd>
        </template>
      </dl>

      <ul
        v-if="row.errors.length"
        class="mt-2 flex flex-col gap-0.5 text-sm text-red-700 dark:text-red-300"
      >
        <li v-for="(error, i) in row.errors" :key="i" class="flex gap-1.5">
          <span class="mdi mdi-alert-circle-outline mt-0.5" aria-hidden="true" />
          <span
            ><strong v-if="error.field" class="font-medium">{{ labels[error.field] }}:</strong>
            {{ error.message }}</span
          >
        </li>
      </ul>
      <ul
        v-if="row.warnings.length && !dimmed"
        class="mt-2 flex flex-col gap-0.5 text-sm text-amber-700 dark:text-amber-300"
      >
        <li v-for="(warning, i) in row.warnings" :key="i" class="flex gap-1.5">
          <span class="mdi mdi-information-outline mt-0.5" aria-hidden="true" />{{ warning }}
        </li>
      </ul>
      <p
        v-if="state === 'failed' && failure"
        class="mt-2 flex gap-1.5 text-sm text-red-700 dark:text-red-300"
        role="alert"
      >
        <span class="mdi mdi-close-circle-outline mt-0.5" aria-hidden="true" />No se importó:
        {{ failure }}
      </p>
    </div>

    <div class="flex shrink-0 items-center gap-1.5 sm:pt-0.5">
      <template v-if="state === 'imported'">
        <span class="flex items-center gap-1 text-sm font-medium text-mint-700 dark:text-mint-300">
          <span class="mdi mdi-check-circle" aria-hidden="true" /> Importado
        </span>
      </template>
      <template v-else-if="state === 'discarded'">
        <UiButton size="sm" variant="ghost" @click="emit('restore')">
          <span class="mdi mdi-undo mr-1" aria-hidden="true" />Deshacer
        </UiButton>
      </template>
      <template v-else>
        <UiButton
          v-if="importable"
          size="sm"
          color="primary"
          :loading="state === 'importing'"
          :disabled="busy && state !== 'importing'"
          :aria-label="`Importar la fila ${row.line}`"
          @click="emit('import')"
        >
          <span class="mdi mdi-database-import-outline mr-1" aria-hidden="true" />Importar
        </UiButton>
        <UiButton
          size="sm"
          variant="ghost"
          :disabled="state === 'importing'"
          :aria-label="`Descartar la fila ${row.line}`"
          @click="emit('discard')"
        >
          Descartar
        </UiButton>
      </template>
    </div>
  </li>
</template>
