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
  UiTextarea,
  useToast,
} from '@aptoph/ui'
import {
  PARKING_AUTHORIZATIONS,
  PARKING_AUTHORIZATION_LABELS,
  PLATE_REQUIRED_TYPES,
  OCCUPANT_RELATIONSHIP_LABELS,
  VEHICLE_TYPES,
  VEHICLE_TYPE_ICONS,
  VEHICLE_TYPE_LABELS,
  normalizePlate,
  type ParkingAuthorization,
  type ParkingLookup,
  type ParkingStay,
  type ParkingSummary,
  type UnitOccupant,
  type VehicleType,
} from '@aptoph/shared'
import UnitPicker, { type PickedUnit } from '@/components/finance/UnitPicker.vue'
import { occupantsApi } from '@/api/backoffice'
import { visitorParkingApi } from '@/api/visitorParking'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'

const props = defineProps<{ summary: ParkingSummary | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [stay: ParkingStay]; exit: [stay: ParkingStay] }>()
const toast = useToast()

type Visit = ParkingLookup['visits'][number]

const empty = () => ({
  vehicleType: 'car' as VehicleType,
  plate: '',
  vehicleDescription: '',
  visitorName: '',
  visitorDocument: '',
  authorization: 'call' as Exclude<ParkingAuthorization, 'pre_authorized'>,
  authorizedByName: '',
  authorizationNotes: '',
})
const form = ref(empty())
const unit = ref<PickedUnit | null>(null)
const visit = ref<Visit | null>(null)
const occupants = ref<UnitOccupant[]>([])
const search = ref('')
const lookup = ref<ParkingLookup | null>(null)
const searching = ref(false)
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  form.value = empty()
  unit.value = null
  visit.value = null
  occupants.value = []
  search.value = ''
  lookup.value = null
  errors.value = {}
  error.value = null
})

/** The guard types a plate, an access code or a name */
let timer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(timer)
  const term = value.trim()
  if (term.length < 2) {
    lookup.value = null
    return
  }
  timer = setTimeout(async () => {
    searching.value = true
    try {
      const found = (await visitorParkingApi.lookup(term)).data
      if (search.value.trim() !== term) return
      lookup.value = found
      // The access code of the portal: that visit, nothing else to choose
      const byCode = found.visits.find((item) => item.accessCode === term.toUpperCase())
      if (byCode) {
        useVisit(byCode)
        return
      }
      // A plate-looking term goes straight to the plate field
      const plate = normalizePlate(term)
      if (plate && /\d/.test(plate) && !visit.value && !found.codeIssue) form.value.plate = plate
    } catch {
      lookup.value = null
    } finally {
      searching.value = false
    }
  }, 350)
})

function useVisit(item: Visit) {
  visit.value = item
  unit.value = {
    id: item.unit.id,
    code: item.unit.code,
    label: [item.unit.building?.name, item.unit.code].filter(Boolean).join(' · '),
  }
  form.value.visitorName = item.visitorName
  form.value.visitorDocument = item.visitorDocument ?? ''
  form.value.plate = normalizePlate(item.vehiclePlate) ?? ''
}
function clearVisit() {
  visit.value = null
}

watch(unit, async (picked) => {
  occupants.value = []
  if (!picked || visit.value) return
  try {
    const today = new Date().toISOString().slice(0, 10)
    occupants.value = (await occupantsApi.list(picked.id)).data.filter(
      (o) => !o.endsOn || o.endsOn >= today,
    )
  } catch {
    // Only a help to announce the visitor
  }
})

const capacityOf = (type: VehicleType) => props.summary?.byType.find((row) => row.type === type)
const isFull = (type: VehicleType) => {
  const row = capacityOf(type)
  return !!row && row.inside >= row.capacity
}
const plateRequired = computed(() => PLATE_REQUIRED_TYPES.includes(form.value.vehicleType))
const authorizationOptions = PARKING_AUTHORIZATIONS.filter((a) => a !== 'pre_authorized').map(
  (value) => ({ value, label: PARKING_AUTHORIZATION_LABELS[value] }),
)

async function submit() {
  if (!unit.value) {
    errors.value = { unitId: 'Elige la unidad que visita' }
    return
  }
  saving.value = true
  errors.value = {}
  error.value = null
  const f = form.value
  try {
    const { data } = await visitorParkingApi.enter({
      vehicleType: f.vehicleType,
      plate: f.plate || null,
      vehicleDescription: f.vehicleDescription || null,
      unitId: unit.value.id,
      visitorName: f.visitorName,
      visitorDocument: f.visitorDocument || null,
      visitId: visit.value?.id ?? null,
      authorization: visit.value ? 'pre_authorized' : f.authorization,
      authorizedByName: visit.value ? null : f.authorizedByName || null,
      authorizationNotes: f.authorizationNotes || null,
    })
    toast.success(
      data.overCapacity
        ? `Ingreso registrado sin cupo libre para ${VEHICLE_TYPE_LABELS[data.vehicleType].toLowerCase()}`
        : 'Ingreso registrado',
    )
    emit('saved', data)
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
  <UiModal v-model="open" title="Registrar ingreso" size="lg" scrollable :persistent="saving">
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>

      <!-- Lookup -->
      <UiLabel
        title="Buscar"
        help-text="Placa, código de acceso del portal o nombre del visitante."
      >
        <UiInput
          v-model="search"
          type="search"
          placeholder="ABC123, K7P2Q9 o un nombre"
          autofocus
          autocomplete="off"
        />
      </UiLabel>

      <template v-if="lookup">
        <UiAlert v-if="lookup.inside" color="danger" variant="soft">
          <span class="flex flex-wrap items-center justify-between gap-2">
            <span
              >{{ lookup.inside.plate }} ya está adentro desde el
              {{ formatDateTime(lookup.inside.enteredAt) }}.</span
            >
            <UiButton size="sm" variant="outline" @click="emit('exit', lookup.inside!)"
              >Dar salida</UiButton
            >
          </span>
        </UiAlert>
        <UiAlert v-if="lookup.codeIssue" color="warning" variant="soft">
          El código es de {{ lookup.codeIssue.visitorName }} ({{
            [lookup.codeIssue.unit.building?.name, lookup.codeIssue.unit.code]
              .filter(Boolean)
              .join(' · ')
          }})
          <template v-if="lookup.codeIssue.reason === 'used'"
            >y ya se usó el {{ formatDateTime(lookup.codeIssue.checkedInAt!) }}.</template
          >
          <template v-else-if="lookup.codeIssue.reason === 'upcoming'"
            >pero la visita está autorizada para el
            {{ formatDateTime(lookup.codeIssue.expectedAt!) }}.</template
          >
          <template v-else
            >y venció<template v-if="lookup.codeIssue.expectedAt">
              (era para el {{ formatDateTime(lookup.codeIssue.expectedAt) }})</template
            >.</template
          >
          Si el residente lo confirma, anuncia la visita.
        </UiAlert>
        <UiAlert v-if="lookup.residentVehicle" color="warning" variant="soft">
          La placa {{ lookup.residentVehicle.plate }} es de un residente ({{
            [lookup.residentVehicle.unit.building?.name, lookup.residentVehicle.unit.code]
              .filter(Boolean)
              .join(' · ')
          }}): no es un visitante.
        </UiAlert>
        <section v-if="lookup.visits.length" aria-label="Visitas autorizadas">
          <h3 class="mb-2 text-sm font-semibold">Autorizadas desde el portal</h3>
          <ul class="flex flex-col gap-2">
            <li v-for="item in lookup.visits" :key="item.id">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 rounded-xl p-3 text-left text-sm ring-1 transition"
                :class="
                  visit?.id === item.id
                    ? 'bg-mint-50 ring-mint-400 dark:bg-mint-400/10'
                    : 'ring-neutral-200 hover:ring-mint-400 dark:ring-white/10'
                "
                @click="useVisit(item)"
              >
                <span class="min-w-0">
                  <span class="block font-medium">{{ item.visitorName }}</span>
                  <span class="block text-xs text-neutral-500"
                    >{{ [item.unit.building?.name, item.unit.code].filter(Boolean).join(' · ') }}
                    <template v-if="item.authorizedBy">
                      · autorizó {{ item.authorizedBy }}</template
                    >
                    <template v-if="item.expectedAt">
                      · {{ formatDateTime(item.expectedAt) }}</template
                    >
                  </span>
                </span>
                <span class="shrink-0 text-right text-xs">
                  <span v-if="item.vehiclePlate" class="block font-mono font-semibold">{{
                    item.vehiclePlate
                  }}</span>
                  <span v-if="item.accessCode" class="block text-neutral-500">{{
                    item.accessCode
                  }}</span>
                </span>
              </button>
            </li>
          </ul>
        </section>
        <p
          v-else-if="!lookup.inside && !lookup.codeIssue && !searching"
          class="text-sm text-neutral-500"
        >
          No hay visitas autorizadas que coincidan: anúncialo con la unidad.
        </p>
      </template>

      <!-- Vehicle -->
      <fieldset>
        <legend class="mb-2 text-sm font-medium">Vehículo</legend>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            v-for="type in VEHICLE_TYPES"
            :key="type"
            type="button"
            class="flex flex-col items-center gap-1 rounded-xl p-3 text-sm ring-1 transition"
            :class="
              form.vehicleType === type
                ? 'bg-mint-50 font-semibold ring-mint-400 dark:bg-mint-400/10'
                : 'ring-neutral-200 hover:ring-mint-400 dark:ring-white/10'
            "
            :aria-pressed="form.vehicleType === type"
            @click="form.vehicleType = type"
          >
            <i class="mdi text-2xl" :class="VEHICLE_TYPE_ICONS[type]" aria-hidden="true" />
            {{ VEHICLE_TYPE_LABELS[type] }}
            <span
              v-if="capacityOf(type)"
              class="text-xs font-normal"
              :class="isFull(type) ? 'text-coral-700 dark:text-coral-300' : 'text-neutral-500'"
              >{{ capacityOf(type)!.inside }}/{{ capacityOf(type)!.capacity }}</span
            >
          </button>
        </div>
      </fieldset>
      <UiAlert v-if="isFull(form.vehicleType)" color="warning" variant="soft">
        No quedan cupos para {{ VEHICLE_TYPE_LABELS[form.vehicleType].toLowerCase() }}. Puedes
        registrar el ingreso igual: quedará marcado sin cupo.
      </UiAlert>

      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Placa" :required="plateRequired" :error="errors.plate">
          <UiInput
            v-model="form.plate"
            :required="plateRequired"
            maxlength="12"
            placeholder="ABC123"
            class="font-mono uppercase"
            autocomplete="off"
          />
        </UiLabel>
        <UiLabel
          title="Descripción"
          :help-text="plateRequired ? 'Color, marca (opcional)' : 'Obligatoria si no tiene placa'"
          :error="errors.vehicleDescription"
        >
          <UiInput v-model="form.vehicleDescription" maxlength="100" placeholder="Roja, GW" />
        </UiLabel>
      </div>

      <!-- Unit -->
      <UiLabel title="Unidad que visita" required :error="errors.unitId">
        <div
          v-if="unit"
          class="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-white/5"
        >
          <span class="font-medium">{{ unit.label }}</span>
          <UiButton v-if="!visit" size="sm" variant="ghost" @click="unit = null">Cambiar</UiButton>
        </div>
        <UnitPicker v-else @pick="(picked) => (unit = picked)" />
      </UiLabel>

      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Nombre del visitante" required :error="errors.visitorName">
          <UiInput v-model="form.visitorName" required maxlength="150" />
        </UiLabel>
        <UiLabel title="Documento" :error="errors.visitorDocument">
          <UiInput v-model="form.visitorDocument" maxlength="30" />
        </UiLabel>
      </div>

      <!-- Authorization -->
      <UiAlert v-if="visit" color="success" variant="soft">
        <span class="flex flex-wrap items-center justify-between gap-2">
          <span
            >Autorizado desde el portal<template v-if="visit.authorizedBy">
              por {{ visit.authorizedBy }}</template
            >.</span
          >
          <UiButton size="sm" variant="ghost" @click="clearVisit">No es esta visita</UiButton>
        </span>
      </UiAlert>
      <template v-else>
        <section
          v-if="occupants.length"
          class="rounded-xl bg-neutral-50 p-3 text-sm dark:bg-white/5"
          aria-label="Residentes de la unidad"
        >
          <h3 class="mb-2 font-semibold">Anuncia la visita</h3>
          <ul class="flex flex-col gap-1.5">
            <li
              v-for="person in occupants"
              :key="person.id"
              class="flex items-center justify-between gap-2"
            >
              <button
                type="button"
                class="min-w-0 text-left hover:underline"
                title="Usar como quien autorizó"
                @click="form.authorizedByName = person.fullName"
              >
                <span class="font-medium">{{ person.fullName }}</span>
                <span class="text-xs text-neutral-500">
                  · {{ OCCUPANT_RELATIONSHIP_LABELS[person.relationship] }}</span
                >
              </button>
              <a
                v-if="person.phone"
                :href="`tel:${person.phone}`"
                class="inline-flex shrink-0 items-center gap-1 text-mint-700 hover:underline dark:text-mint-300"
                ><i class="mdi mdi-phone" aria-hidden="true" />{{ person.phone }}</a
              >
            </li>
          </ul>
        </section>
        <div class="grid gap-4 sm:grid-cols-2">
          <UiLabel title="Cómo se autorizó" required :error="errors.authorization">
            <UiSelect v-model="form.authorization" :options="authorizationOptions" block />
          </UiLabel>
          <UiLabel title="Quién autorizó" required :error="errors.authorizedByName">
            <UiInput
              v-model="form.authorizedByName"
              required
              maxlength="150"
              placeholder="Nombre del residente"
            />
          </UiLabel>
        </div>
      </template>
      <UiLabel title="Notas" :error="errors.authorizationNotes">
        <UiTextarea v-model="form.authorizationNotes" rows="2" maxlength="500" block />
      </UiLabel>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving">Registrar ingreso</UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
