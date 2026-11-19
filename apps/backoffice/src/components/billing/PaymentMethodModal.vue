<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  DuiAlert,
  DuiButton,
  DuiCheckbox,
  DuiForm,
  DuiInput,
  DuiLabel,
  DuiModal,
  DuiSelect,
  DuiTabs,
} from '@dronico/droni-kit'
import type { BillingConfig, BillingOverview, PaymentMethodType } from '@aptoph/shared'
import { billingApi } from '@/api/backoffice'
import { errorMessage, fieldErrors } from '@/lib/errors'
import {
  WompiCardError,
  rememberBancolombia,
  tokenizeCard,
  validCardNumber,
  waitForToken,
} from '@/lib/wompi'

/**
 * Saves the conjunto's payment method in Wompi (card, Nequi, Bancolombia or
 * DaviPlata). docs/billing.md
 */
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [BillingOverview] }>()

const config = ref<BillingConfig | null>(null)
const loadError = ref<string | null>(null)
const tab = ref<string>('CARD')
const accepted = ref({ policy: false, personalData: false })
const busy = ref(false)
const waiting = ref<string | null>(null)
const error = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const signal = { cancelled: false }

const card = ref({ number: '', holder: '', expMonth: '', expYear: '', cvc: '' })
const nequiPhone = ref('')
const davi = ref({ documentType: 'CC', documentNumber: '', phoneNumber: '', code: '' })
const daviHandle = ref<string | null>(null)

const tabs = [
  { label: 'Tarjeta', value: 'CARD' },
  { label: 'Nequi', value: 'NEQUI' },
  { label: 'Bancolombia', value: 'BANCOLOMBIA_TRANSFER' },
  { label: 'DaviPlata', value: 'DAVIPLATA' },
]
const documentTypes = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PP', label: 'Pasaporte' },
  { value: 'TI', label: 'Tarjeta de identidad' },
]

watch(open, async (isOpen) => {
  signal.cancelled = !isOpen
  if (!isOpen) return
  reset()
  await loadConfig()
})
onBeforeUnmount(() => {
  signal.cancelled = true
})

function reset() {
  error.value = null
  errors.value = {}
  waiting.value = null
  busy.value = false
  accepted.value = { policy: false, personalData: false }
  card.value = { number: '', holder: '', expMonth: '', expYear: '', cvc: '' }
  nequiPhone.value = ''
  davi.value = { documentType: 'CC', documentNumber: '', phoneNumber: '', code: '' }
  daviHandle.value = null
}

/** Wompi's acceptance tokens are single-use: fresh ones for every attempt */
async function loadConfig() {
  loadError.value = null
  config.value = null
  try {
    config.value = (await billingApi.config()).data
  } catch (e) {
    loadError.value = errorMessage(e, 'Los pagos en línea no están disponibles en este momento.')
  }
}

const canContinue = computed(
  () => !!config.value && accepted.value.policy && accepted.value.personalData && !busy.value,
)

async function save(
  type: PaymentMethodType,
  token: string,
  expiry?: { month: number; year: number },
) {
  const current = config.value!
  const { data } = await billingApi.savePaymentMethod({
    type,
    token,
    acceptanceToken: current.acceptance.acceptanceToken,
    personalAuthToken: current.acceptance.personalAuthToken,
    expMonth: expiry?.month,
    expYear: expiry?.year,
  })
  emit('saved', data)
  open.value = false
}

async function run(work: () => Promise<void>) {
  if (!canContinue.value) return
  busy.value = true
  error.value = null
  errors.value = {}
  try {
    await work()
  } catch (e) {
    if (e instanceof WompiCardError) {
      errors.value = e.fields
      error.value = Object.keys(e.fields).length ? null : e.message
    } else {
      errors.value = fieldErrors(e)
      error.value = Object.keys(errors.value).length ? null : errorMessage(e)
    }
    // A failed attempt may have used the acceptance tokens
    await loadConfig()
    accepted.value = { policy: false, personalData: false }
  } finally {
    busy.value = false
    waiting.value = null
  }
}

function submitCard() {
  return run(async () => {
    const problems: Record<string, string> = {}
    if (!validCardNumber(card.value.number)) problems.number = 'Revisa el número de la tarjeta'
    if (!/^\d{3,4}$/.test(card.value.cvc.trim())) problems.cvc = 'Código de 3 o 4 dígitos'
    const month = Number(card.value.expMonth)
    if (!(month >= 1 && month <= 12)) problems.expMonth = 'Mes de 1 a 12'
    if (!/^\d{2}$/.test(card.value.expYear.trim())) problems.expYear = 'Año en 2 dígitos'
    if (card.value.holder.trim().length < 5) problems.holder = 'Nombre como aparece en la tarjeta'
    if (Object.keys(problems).length) throw new WompiCardError('', problems)
    const token = await tokenizeCard(config.value!, card.value)
    await save('CARD', token.id, { month: token.expMonth, year: token.expYear })
  })
}

function submitNequi() {
  return run(async () => {
    const { data } = await billingApi.nequiToken(nequiPhone.value.trim())
    waiting.value = 'Abre la app Nequi en tu celular y acepta la suscripción de AptoPH.'
    const token = await waitForToken('nequi', data.id, { signal })
    if (token.status !== 'APPROVED') {
      throw new Error(
        token.status === 'PENDING'
          ? 'No recibimos la aprobación a tiempo. Intenta de nuevo.'
          : 'Nequi no aprobó la suscripción.',
      )
    }
    await save('NEQUI', data.id)
  })
}

function submitBancolombia() {
  return run(async () => {
    const { data } = await billingApi.bancolombiaToken()
    if (!data.authorizationUrl) throw new Error('Bancolombia no respondió. Intenta de nuevo.')
    rememberBancolombia({
      tokenId: data.id,
      acceptanceToken: config.value!.acceptance.acceptanceToken,
      personalAuthToken: config.value!.acceptance.personalAuthToken,
    })
    window.location.assign(data.authorizationUrl)
  })
}

function sendDaviCode() {
  return run(async () => {
    const { data } = await billingApi.daviplataToken({
      documentType: davi.value.documentType,
      documentNumber: davi.value.documentNumber.trim(),
      phoneNumber: davi.value.phoneNumber.trim(),
    })
    daviHandle.value = data.handle ?? null
  })
}

async function validateDaviCode() {
  if (!daviHandle.value) return
  busy.value = true
  error.value = null
  errors.value = {}
  try {
    const { data } = await billingApi.daviplataOtp({
      handle: daviHandle.value,
      code: davi.value.code.trim(),
    })
    if (data.status !== 'APPROVED') throw new Error('DaviPlata no aprobó la suscripción.')
    await save('DAVIPLATA', data.id)
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? null : errorMessage(e)
  } finally {
    busy.value = false
  }
}

async function resendDaviCode() {
  if (!daviHandle.value) return
  try {
    await billingApi.daviplataOtp({ handle: daviHandle.value })
    error.value = null
  } catch (e) {
    error.value = errorMessage(e)
  }
}

function submit() {
  if (tab.value === 'CARD') return submitCard()
  if (tab.value === 'NEQUI') return submitNequi()
  if (tab.value === 'BANCOLOMBIA_TRANSFER') return submitBancolombia()
  return daviHandle.value ? validateDaviCode() : sendDaviCode()
}

const submitLabel = computed(() => {
  if (tab.value === 'BANCOLOMBIA_TRANSFER') return 'Autorizar en Bancolombia'
  if (tab.value === 'DAVIPLATA') return daviHandle.value ? 'Confirmar código' : 'Enviar código'
  if (tab.value === 'NEQUI') return 'Enviar a Nequi'
  return 'Guardar tarjeta'
})
</script>

<template>
  <DuiModal v-model="open" title="Medio de pago" size="lg" :persistent="busy" scrollable>
    <DuiAlert v-if="loadError" color="danger" variant="soft">{{ loadError }}</DuiAlert>
    <DuiForm v-else :loading="busy" @submit="submit">
      <DuiTabs
        v-model="tab"
        :tabs="tabs"
        aria-label="Medio de pago"
        @update:model-value="() => ((error = null), (errors = {}))"
      />

      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <DuiAlert v-if="waiting" color="primary" variant="soft">
        <i class="mdi mdi-cellphone-check" aria-hidden="true" /> {{ waiting }}
      </DuiAlert>

      <template v-if="tab === 'CARD'">
        <p class="text-sm text-neutral-500">
          Crédito o débito. Los datos de la tarjeta van directo a Wompi; AptoPH no los recibe ni los
          guarda.
        </p>
        <DuiLabel title="Número de la tarjeta" required :error="errors.number">
          <DuiInput
            v-model="card.number"
            inputmode="numeric"
            autocomplete="cc-number"
            maxlength="23"
            placeholder="4242 4242 4242 4242"
            required
          />
        </DuiLabel>
        <DuiLabel title="Nombre en la tarjeta" required :error="errors.holder">
          <DuiInput v-model="card.holder" autocomplete="cc-name" maxlength="60" required />
        </DuiLabel>
        <div class="grid grid-cols-3 gap-3">
          <DuiLabel title="Mes" required :error="errors.expMonth">
            <DuiInput
              v-model="card.expMonth"
              inputmode="numeric"
              autocomplete="cc-exp-month"
              maxlength="2"
              placeholder="MM"
              required
            />
          </DuiLabel>
          <DuiLabel title="Año" required :error="errors.expYear">
            <DuiInput
              v-model="card.expYear"
              inputmode="numeric"
              autocomplete="cc-exp-year"
              maxlength="2"
              placeholder="AA"
              required
            />
          </DuiLabel>
          <DuiLabel title="CVC" required :error="errors.cvc">
            <DuiInput
              v-model="card.cvc"
              inputmode="numeric"
              autocomplete="cc-csc"
              maxlength="4"
              type="password"
              required
            />
          </DuiLabel>
        </div>
      </template>

      <template v-else-if="tab === 'NEQUI'">
        <p class="text-sm text-neutral-500">
          Te llegará una notificación en la app Nequi para autorizar los cobros de AptoPH.
        </p>
        <DuiLabel title="Celular Nequi" required :error="errors.phoneNumber">
          <DuiInput
            v-model="nequiPhone"
            inputmode="numeric"
            autocomplete="tel-national"
            maxlength="10"
            placeholder="3001234567"
            required
          />
        </DuiLabel>
      </template>

      <template v-else-if="tab === 'BANCOLOMBIA_TRANSFER'">
        <p class="text-sm text-neutral-500">
          Te llevamos a la página de Bancolombia para autorizar el débito de tu cuenta. Al terminar
          vuelves aquí y el medio de pago queda guardado.
        </p>
      </template>

      <template v-else>
        <p class="text-sm text-neutral-500">
          DaviPlata te enviará un código por mensaje de texto para autorizar los cobros.
        </p>
        <template v-if="!daviHandle">
          <div class="grid gap-3 sm:grid-cols-2">
            <DuiLabel title="Tipo de documento" required>
              <DuiSelect v-model="davi.documentType" :options="documentTypes" block />
            </DuiLabel>
            <DuiLabel title="Número de documento" required :error="errors.documentNumber">
              <DuiInput v-model="davi.documentNumber" inputmode="numeric" maxlength="15" required />
            </DuiLabel>
          </div>
          <DuiLabel title="Celular DaviPlata" required :error="errors.phoneNumber">
            <DuiInput
              v-model="davi.phoneNumber"
              inputmode="numeric"
              autocomplete="tel-national"
              maxlength="10"
              placeholder="3001234567"
              required
            />
          </DuiLabel>
        </template>
        <template v-else>
          <DuiLabel title="Código que te llegó" required :error="errors.code">
            <DuiInput
              v-model="davi.code"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              required
            />
          </DuiLabel>
          <button
            type="button"
            class="self-start text-sm text-mint-700 hover:underline dark:text-mint-300"
            @click="resendDaviCode"
          >
            Enviar el código de nuevo
          </button>
        </template>
      </template>

      <fieldset
        v-if="!(tab === 'DAVIPLATA' && daviHandle)"
        class="flex flex-col gap-2 rounded-xl bg-neutral-50 p-4 text-sm dark:bg-white/5"
      >
        <legend class="sr-only">Contratos de Wompi</legend>
        <DuiCheckbox v-model="accepted.policy" :disabled="!config">
          <span>
            Acepto los
            <a
              :href="config?.acceptance.policyUrl"
              target="_blank"
              rel="noopener"
              class="font-medium underline"
              >términos y condiciones</a
            >
            de Wompi.
          </span>
        </DuiCheckbox>
        <DuiCheckbox v-model="accepted.personalData" :disabled="!config">
          <span>
            Autorizo el
            <a
              :href="config?.acceptance.personalDataUrl"
              target="_blank"
              rel="noopener"
              class="font-medium underline"
              >tratamiento de mis datos personales</a
            >
            por parte de Wompi.
          </span>
        </DuiCheckbox>
      </fieldset>
      <p v-if="config?.environment === 'sandbox'" class="text-xs text-amber-700">
        Modo de pruebas (Sandbox): no se cobra dinero real.
      </p>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="busy" @click="open = false">Cancelar</DuiButton>
          <DuiButton
            type="submit"
            color="primary"
            :loading="busy"
            :disabled="tab === 'DAVIPLATA' && daviHandle ? busy : !canContinue"
            >{{ submitLabel }}</DuiButton
          >
        </div>
      </template>
    </DuiForm>
  </DuiModal>
</template>
