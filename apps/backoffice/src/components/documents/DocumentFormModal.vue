<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiButton,
  UiForm,
  UiInput,
  UiLabel,
  UiModal,
  UiSelect,
  UiSwitch,
  UiTextarea,
  useToast,
} from '@aptoph/ui'
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_HINTS,
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_DEFAULT_VISIBILITY,
  DOCUMENT_EXPIRING_CATEGORIES,
  DOCUMENT_MAX_MB,
  DOCUMENT_VISIBILITIES,
  DOCUMENT_VISIBILITY_DESCRIPTIONS,
  DOCUMENT_VISIBILITY_ICONS,
  DOCUMENT_VISIBILITY_LABELS,
  formatFileSize,
  type DocumentDetail,
  type DocumentFolder,
  type DocumentInput,
  type DocumentVisibility,
  type UnitRef,
  type Vendor,
} from '@aptoph/shared'
import { documentsApi } from '@/api/documents'
import { financeApi } from '@/api/finance'
import { unitsApi } from '@/api/backoffice'
import { folderTree } from '@/lib/documents'
import { errorMessage, fieldErrors } from '@/lib/errors'

const props = defineProps<{
  /** Editing this one; null creates */
  document: DocumentDetail | null
  folders: DocumentFolder[]
  /** Folder selected in the list, for a new document */
  folderId?: string | null
}>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [document: DocumentDetail] }>()
const toast = useToast()

type Form = Omit<DocumentInput, 'unitIds'> & { units: UnitRef[] }

const empty = (): Form => ({
  title: '',
  description: '',
  category: 'minutes',
  visibility: DOCUMENT_DEFAULT_VISIBILITY.minutes,
  reference: '',
  documentDate: '',
  expiresOn: '',
  folderId: props.folderId ?? null,
  vendorId: null,
  units: [],
})

const form = ref<Form>(empty())
const file = ref<File | null>(null)
const publish = ref(true)
const notify = ref(true)
/** The person chose the visibility: the category stops suggesting it */
const visibilityTouched = ref(false)
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const vendors = ref<Vendor[]>([])

watch(open, async (value) => {
  if (!value) return
  errors.value = {}
  error.value = null
  file.value = null
  publish.value = true
  notify.value = true
  const d = props.document
  visibilityTouched.value = !!d
  form.value = d
    ? {
        title: d.title,
        description: d.description ?? '',
        category: d.category,
        visibility: d.visibility ?? 'private',
        reference: d.reference ?? '',
        documentDate: d.documentDate ?? '',
        expiresOn: d.expiresOn ?? '',
        folderId: d.folder?.id ?? null,
        vendorId: d.vendor?.id ?? null,
        units: d.units ?? [],
      }
    : empty()
  if (!vendors.value.length) {
    try {
      vendors.value = (await financeApi.vendors({ active: true })).data
    } catch {
      // The vendor is optional
    }
  }
})

watch(
  () => form.value.category,
  (category) => {
    if (!visibilityTouched.value) form.value.visibility = DOCUMENT_DEFAULT_VISIBILITY[category]
  },
)

const categoryOptions = DOCUMENT_CATEGORIES.map((value) => ({
  value,
  label: DOCUMENT_CATEGORY_LABELS[value],
}))
const folderOptions = computed(() => [
  { value: null, label: 'Sin carpeta' },
  ...folderTree(props.folders).map((f) => ({
    value: f.id,
    label: `${'  '.repeat(f.depth)}${f.name}`,
  })),
])
const vendorOptions = computed(() => [
  { value: null, label: 'Ninguno' },
  ...vendors.value.map((v) => ({ value: v.id, label: v.name })),
])
const expiring = computed(
  () => DOCUMENT_EXPIRING_CATEGORIES.includes(form.value.category) || !!form.value.expiresOn,
)
const withVendor = computed(
  () =>
    ['contract', 'quote', 'policy', 'support'].includes(form.value.category) ||
    !!form.value.vendorId,
)
/** Notifying makes no sense for what only the administration sees */
const canNotify = computed(() => form.value.visibility !== 'private')

function chooseVisibility(value: DocumentVisibility) {
  visibilityTouched.value = true
  form.value.visibility = value
}

/* Units picker */
const unitSearch = ref('')
const unitResults = ref<UnitRef[]>([])
const searchingUnits = ref(false)
let unitTimer: ReturnType<typeof setTimeout> | undefined
watch(unitSearch, (value) => {
  clearTimeout(unitTimer)
  if (!value.trim()) {
    unitResults.value = []
    return
  }
  unitTimer = setTimeout(async () => {
    searchingUnits.value = true
    try {
      const { data } = await unitsApi.list({ search: value.trim(), perPage: 20 })
      unitResults.value = data.map((u) => ({
        id: u.id,
        code: u.code,
        type: u.type,
        building: u.building ? { id: u.building.id, name: u.building.name } : null,
      }))
    } catch {
      unitResults.value = []
    } finally {
      searchingUnits.value = false
    }
  }, 250)
})
const unitLabel = (u: UnitRef) => (u.building ? `${u.building.name} · ${u.code}` : u.code)
function toggleUnit(unit: UnitRef) {
  const units = form.value.units
  const index = units.findIndex((u) => u.id === unit.id)
  if (index >= 0) units.splice(index, 1)
  else units.push(unit)
}

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const chosen = input.files?.[0] ?? null
  if (chosen && chosen.size > DOCUMENT_MAX_MB * 1024 * 1024) {
    errors.value = { ...errors.value, file: `El archivo supera ${DOCUMENT_MAX_MB} MB` }
    input.value = ''
    return
  }
  errors.value = { ...errors.value, file: '' }
  file.value = chosen
  // The file name is a good first title
  if (chosen && !form.value.title.trim()) {
    form.value.title = chosen.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
  }
}

function payload(): DocumentInput {
  const f = form.value
  return {
    title: f.title,
    description: f.description || null,
    category: f.category,
    visibility: f.visibility,
    reference: f.reference || null,
    documentDate: f.documentDate || null,
    expiresOn: expiring.value ? f.expiresOn || null : null,
    folderId: f.folderId,
    vendorId: withVendor.value ? f.vendorId : null,
    unitIds: f.visibility === 'units' ? f.units.map((u) => u.id) : [],
  }
}

async function submit() {
  errors.value = {}
  error.value = null
  if (!props.document && !file.value) {
    errors.value = { file: 'Elige el archivo' }
    return
  }
  saving.value = true
  try {
    if (props.document) {
      const { data } = await documentsApi.update(props.document.id, payload())
      toast.success('Documento actualizado')
      emit('saved', data)
    } else {
      const { data, notified } = await documentsApi.create(payload(), file.value!, {
        publish: publish.value,
        notify: publish.value && notify.value && canNotify.value,
      })
      toast.success(
        publish.value
          ? notified
            ? `Documento publicado. Se avisó a ${notified} ${notified === 1 ? 'persona' : 'personas'}`
            : 'Documento publicado'
          : 'Borrador guardado: publícalo cuando esté listo',
      )
      emit('saved', data)
    }
    open.value = false
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? null : errorMessage(e)
  } finally {
    saving.value = false
  }
}

const unitErrors = computed(() =>
  Object.entries(errors.value)
    .filter(([key]) => key.startsWith('unitIds'))
    .map(([, message]) => message)
    .join(' '),
)
</script>

<template>
  <UiModal
    v-model="open"
    :title="document ? 'Editar documento' : 'Nuevo documento'"
    size="lg"
    scrollable
    :persistent="saving"
  >
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>

      <UiLabel
        v-if="!document"
        title="Archivo"
        required
        :help-text="`PDF, Word, Excel, imágenes, presentaciones o planos. Hasta ${DOCUMENT_MAX_MB} MB.`"
        :error="errors.file"
      >
        <label
          class="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-neutral-300 p-4 transition hover:border-mint-500 dark:border-white/20"
        >
          <i
            class="mdi text-2xl text-neutral-400"
            :class="file ? 'mdi-file-check-outline text-mint-600' : 'mdi-upload'"
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1 text-sm">
            <span v-if="file" class="block truncate font-medium">{{ file.name }}</span>
            <span v-else class="font-medium">Elige el archivo</span>
            <span class="block text-xs text-neutral-500">{{
              file ? formatFileSize(file.size) : 'Haz clic para buscarlo en tu equipo'
            }}</span>
          </span>
          <input type="file" class="sr-only" :accept="DOCUMENT_ACCEPT" @change="onFile" />
        </label>
      </UiLabel>

      <UiLabel title="Título" required :error="errors.title">
        <UiInput
          v-model="form.title"
          required
          minlength="3"
          maxlength="200"
          placeholder="Acta asamblea general ordinaria 2026"
          block
        />
      </UiLabel>

      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel
          title="Categoría"
          required
          :help-text="DOCUMENT_CATEGORY_HINTS[form.category]"
          :error="errors.category"
        >
          <UiSelect v-model="form.category" :options="categoryOptions" block />
        </UiLabel>
        <UiLabel title="Carpeta" :error="errors.folderId">
          <UiSelect v-model="form.folderId" :options="folderOptions" block />
        </UiLabel>
      </div>

      <fieldset class="space-y-2">
        <legend class="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-200">
          Quién lo puede ver <span class="text-coral-600">*</span>
        </legend>
        <div class="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Quién lo puede ver">
          <button
            v-for="value in DOCUMENT_VISIBILITIES"
            :key="value"
            type="button"
            role="radio"
            :aria-checked="form.visibility === value"
            class="flex items-start gap-3 rounded-xl p-3 text-left ring-1 transition"
            :class="
              form.visibility === value
                ? 'bg-mint-50 ring-2 ring-mint-500 dark:bg-mint-400/10'
                : 'ring-neutral-200 hover:ring-mint-400 dark:ring-white/10'
            "
            @click="chooseVisibility(value)"
          >
            <i
              class="mdi mt-0.5 text-lg"
              :class="[
                DOCUMENT_VISIBILITY_ICONS[value],
                form.visibility === value ? 'text-mint-700 dark:text-mint-300' : 'text-neutral-400',
              ]"
              aria-hidden="true"
            />
            <span class="min-w-0">
              <span class="block text-sm font-medium">{{ DOCUMENT_VISIBILITY_LABELS[value] }}</span>
              <span class="block text-xs text-neutral-500 dark:text-neutral-400">{{
                DOCUMENT_VISIBILITY_DESCRIPTIONS[value]
              }}</span>
            </span>
          </button>
        </div>
        <p v-if="errors.visibility" class="text-xs text-coral-700">{{ errors.visibility }}</p>
        <p class="text-xs text-neutral-500">
          La administración siempre ve todos los documentos. Sugerido para
          {{ DOCUMENT_CATEGORY_LABELS[form.category].toLowerCase() }}:
          {{
            DOCUMENT_VISIBILITY_LABELS[DOCUMENT_DEFAULT_VISIBILITY[form.category]].toLowerCase()
          }}.
        </p>
      </fieldset>

      <div
        v-if="form.visibility === 'units'"
        class="space-y-3 rounded-xl bg-neutral-50 p-4 dark:bg-white/5"
      >
        <UiLabel
          title="Unidades"
          required
          help-text="Lo verán los propietarios de estas unidades"
          :error="unitErrors"
        >
          <UiInput
            v-model="unitSearch"
            type="search"
            placeholder="Busca por número de unidad"
            aria-label="Buscar unidad"
            block
          />
        </UiLabel>
        <div v-if="unitResults.length" class="flex flex-wrap gap-2">
          <button
            v-for="unit in unitResults"
            :key="unit.id"
            type="button"
            class="rounded-full px-3 py-1 text-xs ring-1 transition"
            :class="
              form.units.some((u) => u.id === unit.id)
                ? 'bg-mint-600 text-white ring-mint-600'
                : 'ring-neutral-300 hover:ring-mint-500 dark:ring-white/20'
            "
            :aria-pressed="form.units.some((u) => u.id === unit.id)"
            @click="toggleUnit(unit)"
          >
            {{ unitLabel(unit) }}
          </button>
        </div>
        <p v-else-if="unitSearch && !searchingUnits" class="text-xs text-neutral-500">
          Ninguna unidad coincide
        </p>
        <div v-if="form.units.length" class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-medium text-neutral-600 dark:text-neutral-300"
            >Elegidas ({{ form.units.length }}):</span
          >
          <span
            v-for="unit in form.units"
            :key="unit.id"
            class="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-white/10"
          >
            {{ unitLabel(unit) }}
            <button
              type="button"
              class="text-neutral-400 hover:text-coral-600"
              :aria-label="`Quitar ${unitLabel(unit)}`"
              @click="toggleUnit(unit)"
            >
              <i class="mdi mdi-close" aria-hidden="true" />
            </button>
          </span>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <UiLabel
          title="Referencia"
          help-text="N.º de acta, contrato o póliza"
          :error="errors.reference"
        >
          <UiInput v-model="form.reference" maxlength="60" placeholder="Acta 01-2026" block />
        </UiLabel>
        <UiLabel
          title="Fecha del documento"
          help-text="De la reunión, la firma o la expedición"
          :error="errors.documentDate"
        >
          <UiInput v-model="form.documentDate" type="date" block />
        </UiLabel>
        <UiLabel
          v-if="expiring"
          title="Vence el"
          help-text="Te avisamos 30 y 7 días antes"
          :error="errors.expiresOn"
        >
          <UiInput v-model="form.expiresOn" type="date" block />
        </UiLabel>
      </div>

      <UiLabel v-if="withVendor" title="Proveedor" :error="errors.vendorId">
        <UiSelect v-model="form.vendorId" :options="vendorOptions" block />
      </UiLabel>

      <UiLabel title="Descripción" :error="errors.description">
        <UiTextarea
          v-model="form.description"
          rows="2"
          maxlength="2000"
          placeholder="De qué trata, qué se aprobó, qué cubre…"
          block
        />
      </UiLabel>

      <div v-if="!document" class="space-y-3 rounded-xl bg-neutral-50 p-4 dark:bg-white/5">
        <UiSwitch
          v-model="publish"
          label="Publicar ahora"
          description="Si lo apagas queda como borrador y solo la administración lo ve."
        />
        <UiSwitch
          v-if="publish && canNotify"
          v-model="notify"
          label="Avisar a quienes lo pueden ver"
          description="Notificación en la app y correo, según las preferencias de cada persona."
        />
      </div>
    </UiForm>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
        <UiButton color="primary" :loading="saving" @click="submit">
          {{ document ? 'Guardar' : publish ? 'Publicar' : 'Guardar borrador' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
