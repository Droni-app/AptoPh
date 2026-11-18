<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DuiAlert,
  DuiButton,
  DuiInput,
  DuiLabel,
  DuiModal,
  DuiSkeleton,
  useToast,
} from '@dronico/droni-kit'
import type { BillingPreview } from '@aptoph/shared'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoney, formatPeriod, thisMonthInput } from '@/lib/format'

const props = defineProps<{ initialMonth?: string }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ generated: [] }>()
const toast = useToast()

const month = ref(thisMonthInput())
const preview = ref<BillingPreview | null>(null)
const loading = ref(false)
const generating = ref(false)
const error = ref<string | null>(null)
const showLines = ref(false)

async function load() {
  if (!/^\d{4}-\d{2}$/.test(month.value)) return
  loading.value = true
  error.value = null
  try {
    preview.value = (await financeApi.previewPeriod(month.value)).data
  } catch (e) {
    preview.value = null
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

watch(open, (isOpen) => {
  if (!isOpen) return
  month.value = props.initialMonth ?? thisMonthInput()
  showLines.value = false
  load()
})
watch(month, load)

const closed = computed(() => preview.value?.existing?.status === 'closed')
const interestLines = computed(
  () => preview.value?.lines.filter((line) => line.kind === 'interest') ?? [],
)

async function generate() {
  generating.value = true
  try {
    const { data } = await financeApi.generatePeriod(month.value)
    toast.success(
      data.created
        ? `Se crearon ${data.created} cobros por ${formatMoney(data.total)}`
        : 'El periodo ya estaba completo',
    )
    emit('generated')
    open.value = false
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <DuiModal v-model="open" title="Facturar un mes" size="lg" :persistent="generating" scrollable>
    <div class="flex flex-col gap-4">
      <DuiLabel
        title="Mes"
        help-text="Se crean los cobros de las tarifas vigentes, los intereses de mora y se aplican los saldos a favor"
      >
        <DuiInput v-model="month" type="month" required />
      </DuiLabel>

      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <DuiSkeleton v-if="loading && !preview" class="h-40 rounded-xl" />

      <template v-if="preview">
        <DuiAlert v-if="closed" color="warning" variant="soft">
          {{ formatPeriod(preview.period) }} está cerrado. Reábrelo para facturar de nuevo.
        </DuiAlert>
        <DuiAlert
          v-else-if="preview.existing && preview.count === 0"
          color="success"
          variant="soft"
        >
          {{ formatPeriod(preview.period) }} ya está facturado y no falta nada por cobrar.
        </DuiAlert>
        <DuiAlert v-else-if="preview.existing" color="primary" variant="soft">
          {{ formatPeriod(preview.period) }} ya se facturó. Solo se agregará lo que falta (tarifas
          nuevas o intereses).
        </DuiAlert>

        <dl class="grid gap-3 rounded-xl bg-neutral-50 p-4 text-sm sm:grid-cols-3 dark:bg-white/5">
          <div>
            <dt class="text-neutral-500">Vence</dt>
            <dd class="font-semibold">{{ formatDate(preview.dueOn) }}</dd>
          </div>
          <div>
            <dt class="text-neutral-500">Pronto pago</dt>
            <dd class="font-semibold">
              {{
                preview.discountUntil
                  ? `${preview.discountRate} % hasta el ${formatDate(preview.discountUntil)}`
                  : 'No'
              }}
            </dd>
          </div>
          <div>
            <dt class="text-neutral-500">Interés de mora</dt>
            <dd class="font-semibold">
              {{ preview.interestRate ? `${preview.interestRate} % mensual` : 'No se cobra' }}
            </dd>
          </div>
        </dl>

        <table v-if="preview.concepts.length" class="w-full text-sm">
          <thead class="text-left text-xs text-neutral-500 uppercase">
            <tr>
              <th class="py-2 font-medium">Concepto</th>
              <th class="py-2 text-right font-medium">Cobros</th>
              <th class="py-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
            <tr v-for="concept in preview.concepts" :key="concept.conceptId">
              <td class="py-2">{{ concept.name }}</td>
              <td class="py-2 text-right tabular-nums">{{ concept.count }}</td>
              <td class="py-2 text-right tabular-nums">{{ formatMoney(concept.total) }}</td>
            </tr>
            <tr v-if="Number(preview.reserveFund) > 0" class="text-neutral-500">
              <td class="py-2" colspan="2">Apropiación del fondo de imprevistos (contable)</td>
              <td class="py-2 text-right tabular-nums">{{ formatMoney(preview.reserveFund) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="font-semibold">
              <td class="pt-2">Total a facturar</td>
              <td class="pt-2 text-right tabular-nums">{{ preview.count }}</td>
              <td class="pt-2 text-right tabular-nums">{{ formatMoney(preview.total) }}</td>
            </tr>
          </tfoot>
        </table>

        <ul
          v-if="preview.warnings.length"
          class="flex flex-col gap-1 text-sm text-amber-800 dark:text-amber-200"
        >
          <li v-for="warning in preview.warnings" :key="warning" class="flex gap-2">
            <span aria-hidden="true"><i class="mdi mdi-alert-outline" /></span>{{ warning }}
          </li>
        </ul>

        <div v-if="preview.lines.length">
          <button
            type="button"
            class="text-sm font-semibold text-mint-700 underline underline-offset-2 dark:text-mint-300"
            @click="showLines = !showLines"
          >
            {{ showLines ? 'Ocultar detalle' : `Ver detalle por unidad (${preview.lines.length})` }}
            <template v-if="interestLines.length">
              · {{ interestLines.length }} con intereses</template
            >
          </button>
          <div
            v-if="showLines"
            class="mt-2 max-h-72 overflow-y-auto rounded-lg ring-1 ring-neutral-200 dark:ring-white/10"
          >
            <table class="w-full text-sm">
              <tbody class="divide-y divide-neutral-100 dark:divide-white/10">
                <tr v-for="(line, i) in preview.lines" :key="i">
                  <td class="px-3 py-1.5 font-medium">{{ line.unitCode }}</td>
                  <td class="px-3 py-1.5">
                    {{ line.conceptName }}
                    <span v-if="line.description" class="block text-xs text-neutral-500">{{
                      line.description
                    }}</span>
                  </td>
                  <td class="px-3 py-1.5 text-right tabular-nums">
                    {{ formatMoney(line.amount) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <DuiButton variant="ghost" :disabled="generating" @click="open = false">Cancelar</DuiButton>
        <DuiButton
          color="primary"
          :loading="generating"
          :disabled="!preview || closed || preview.count === 0"
          @click="generate"
        >
          Generar {{ preview?.count ? `${preview.count} cobros` : '' }}
        </DuiButton>
      </div>
    </template>
  </DuiModal>
</template>
