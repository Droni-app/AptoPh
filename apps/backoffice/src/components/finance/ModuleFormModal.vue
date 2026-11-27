<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiButton,
  UiForm,
  UiInput,
  UiLabel,
  UiModal,
  useToast,
} from '@aptoph/ui'
import { UNIT_TYPE_LABELS, type ContributionModule } from '@aptoph/shared'
import UnitPicker, { type PickedUnit } from '@/components/finance/UnitPicker.vue'
import { financeApi } from '@/api/finance'
import { unitsApi } from '@/api/backoffice'
import { errorMessage, fieldErrors } from '@/lib/errors'

const props = defineProps<{ module: ContributionModule | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

type Row = PickedUnit & { share: string }
const name = ref('')
const description = ref('')
const rows = ref<Row[]>([])
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)
const loadingAll = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  name.value = props.module?.name ?? ''
  description.value = props.module?.description ?? ''
  rows.value = (props.module?.units ?? []).map((row) => ({
    id: row.unitId,
    code: row.unit?.code ?? '',
    label: row.unit
      ? [row.unit.building, `${UNIT_TYPE_LABELS[row.unit.type]} ${row.unit.code}`]
          .filter(Boolean)
          .join(' · ')
      : row.unitId,
    share: String(Number(row.share)),
  }))
  errors.value = {}
  error.value = null
})

const totalShare = computed(() =>
  rows.value.reduce((sum, row) => sum + (Number(row.share.replace(',', '.')) || 0), 0),
)

/** Adds every unit of the conjunto, with its ownership coefficient as the share */
async function addAll() {
  loadingAll.value = true
  try {
    const present = new Set(rows.value.map((row) => row.id))
    for (let page = 1; page < 100; page++) {
      const result = await unitsApi.list({ page, perPage: 100 })
      for (const unit of result.data) {
        if (present.has(unit.id)) continue
        rows.value.push({
          id: unit.id,
          code: unit.code,
          label: [unit.building?.name, `${UNIT_TYPE_LABELS[unit.type]} ${unit.code}`]
            .filter(Boolean)
            .join(' · '),
          share: String(Number(unit.ownershipCoefficient) * 100),
        })
      }
      if (page >= result.metadata.lastPage) break
    }
  } finally {
    loadingAll.value = false
  }
}

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  const input = {
    name: name.value,
    description: description.value || null,
    units: rows.value.map((row) => ({
      unitId: row.id,
      share: Number(row.share.replace(',', '.')),
    })),
  }
  try {
    if (props.module) await financeApi.updateModule(props.module.id, input)
    else await financeApi.createModule(input)
    toast.success('Módulo guardado')
    emit('saved')
    open.value = false
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? null : errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal
    v-model="open"
    :title="module ? 'Editar módulo' : 'Nuevo módulo de contribución'"
    description="Un sector con su propio gasto (torre con ascensor, locales, parqueaderos). La participación es relativa: cada unidad paga su parte del total del módulo."
    size="lg"
    :persistent="saving"
    scrollable
  >
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Nombre" required :error="errors.name">
          <UiInput v-model="name" maxlength="120" required placeholder="Torre 2 · ascensor" />
        </UiLabel>
        <UiLabel title="Descripción" :error="errors.description">
          <UiInput v-model="description" maxlength="255" />
        </UiLabel>
      </div>
      <UiLabel title="Unidades del módulo" required :error="errors.units">
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <UnitPicker
              class="flex-1"
              :exclude="rows.map((row) => row.id)"
              @pick="rows.push({ ...$event, share: '1' })"
            />
            <UiButton variant="outline" :loading="loadingAll" @click="addAll"
              >Agregar todas</UiButton
            >
          </div>
          <div
            v-if="rows.length"
            class="max-h-72 overflow-y-auto rounded-lg ring-1 ring-neutral-200 dark:ring-white/10"
          >
            <table class="w-full text-sm">
              <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
                <tr v-for="(row, i) in rows" :key="row.id">
                  <td class="px-3 py-1.5">{{ row.label }}</td>
                  <td class="w-32 px-3 py-1.5">
                    <input
                      v-model="row.share"
                      inputmode="decimal"
                      class="w-full rounded-md border border-neutral-300 px-2 py-1 text-right tabular-nums dark:border-white/15 dark:bg-neutral-900"
                      :aria-label="`Participación de ${row.label}`"
                    />
                  </td>
                  <td class="w-10 px-2 py-1.5 text-right">
                    <button
                      type="button"
                      class="text-neutral-400 hover:text-coral-600"
                      :aria-label="`Quitar ${row.label}`"
                      @click="rows.splice(i, 1)"
                    >
                      <i class="mdi mdi-close" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-xs text-neutral-500">
            {{ rows.length }} unidades · suma de participaciones
            {{ totalShare.toLocaleString('es-CO', { maximumFractionDigits: 4 }) }}
          </p>
        </div>
      </UiLabel>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving" :disabled="rows.length === 0"
            >Guardar</UiButton
          >
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
