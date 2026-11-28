<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UiAlert, UiButton, UiForm, UiInput, UiLabel, UiLegalConsent } from '@aptoph/ui'
import {
  MINIMUM_COVERS_UNITS,
  MINIMUM_MONTHLY,
  PRICE_PER_UNIT,
  TRIAL_DAYS,
  formatCop,
  quote,
} from '@aptoph/shared'
import AuthShell from '@/components/AuthShell.vue'
import GoogleButton from '@/components/GoogleButton.vue'
import { googleSignup } from '@/lib/google'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { errorMessage, fieldErrors } from '@/lib/errors'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tenant = useTenantStore()

/** The landing links here with `?unidades=120` */
const queryUnits = String(route.query.unidades ?? '')

const form = ref({
  tenantName: '',
  city: '',
  units: /^\d{1,5}$/.test(queryUnits) ? queryUnits : '',
  fullName: '',
  email: '',
  phone: '',
  password: '',
  acceptTerms: false,
})
/** Back from Google with an account that is new to AptoPH: no password needed */
const google = ref(route.query.google ? googleSignup.read() : null)
if (google.value) {
  form.value.fullName = google.value.profile.fullName
  form.value.email = google.value.profile.email
}

function dropGoogle() {
  googleSignup.clear()
  google.value = null
  form.value.email = ''
  void router.replace({ query: { ...route.query, google: undefined } })
}

const errors = ref<Record<string, string>>({})
const siteUrl = import.meta.env.VITE_SITE_URL
const error = ref<string | null>(null)
const loading = ref(false)

const units = computed(() => Number(form.value.units) || 0)
const estimate = computed(() => (units.value > 0 ? quote(units.value) : null))

async function submit() {
  loading.value = true
  errors.value = {}
  error.value = null
  try {
    const { password, ...rest } = form.value
    const session = await auth.signup(
      google.value
        ? { ...rest, units: units.value, googleTicket: google.value.ticket }
        : { ...rest, password, units: units.value },
    )
    googleSignup.clear()
    tenant.reset()
    await tenant.load()
    tenant.select(session.tenantId)
    await router.replace({ path: '/', query: { bienvenida: '1' } })
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length
      ? 'Revisa los campos marcados para continuar.'
      : errorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell wide>
    <span
      class="self-start rounded-full bg-mint-50 px-3 py-1 text-xs font-semibold text-mint-700 dark:bg-mint-400/10 dark:text-mint-300"
    >
      {{ TRIAL_DAYS }} días gratis, sin tarjeta
    </span>
    <h1
      class="mt-4 text-[2rem] leading-tight font-extrabold tracking-tight text-brand-700 dark:text-white"
    >
      Crea la cuenta de tu conjunto
    </h1>
    <p class="mt-2 text-neutral-600 dark:text-neutral-300">
      Prueba todas las funciones de AptoPH durante {{ TRIAL_DAYS }} días. Al terminar eliges el
      plan; si no, tu información queda guardada en modo consulta.
    </p>

    <div class="mt-8">
      <GoogleButton
        v-if="!google"
        intent="signup"
        label="Registrarme con Google"
        @error="error = $event"
      />
      <div
        v-else
        class="mb-6 flex items-center gap-3 rounded-2xl bg-mint-50 px-4 py-3 text-sm text-mint-800 dark:bg-mint-400/10 dark:text-mint-200"
      >
        <i class="mdi mdi-google text-xl" aria-hidden="true" />
        <span class="min-w-0 flex-1">
          Te registras con la cuenta de Google <strong>{{ google.profile.email }}</strong
          >. No necesitas contraseña.
        </span>
        <button
          type="button"
          class="font-semibold underline underline-offset-2"
          @click="dropGoogle"
        >
          Usar otro correo
        </button>
      </div>

      <UiForm :loading="loading" @submit="submit">
        <UiAlert v-if="error" color="danger" variant="soft" role="alert">{{ error }}</UiAlert>

        <UiLabel title="Nombre del conjunto o edificio" required :error="errors.tenantName">
          <UiInput
            v-model="form.tenantName"
            autocomplete="organization"
            placeholder="Conjunto Residencial Los Álamos"
            required
            autofocus
            block
          />
        </UiLabel>
        <div class="grid gap-4 sm:grid-cols-2">
          <UiLabel title="Ciudad" required :error="errors.city">
            <UiInput v-model="form.city" autocomplete="address-level2" required block />
          </UiLabel>
          <UiLabel title="Número de unidades" required :error="errors.units">
            <UiInput
              v-model="form.units"
              type="number"
              min="1"
              max="20000"
              inputmode="numeric"
              placeholder="120"
              required
              block
            />
          </UiLabel>
        </div>

        <div
          class="rounded-2xl bg-cream p-4 ring-1 ring-brand-900/5 dark:bg-white/5 dark:ring-white/10"
        >
          <p class="text-sm font-semibold text-brand-700 dark:text-white">
            Después de la prueba:
            <span class="tabular-nums">{{ formatCop(PRICE_PER_UNIT) }}</span> por unidad privada al
            mes
          </p>
          <p v-if="estimate" class="mt-2 text-sm text-ink dark:text-neutral-100">
            Tu conjunto pagaría
            <strong class="tabular-nums">{{ formatCop(estimate.monthly) }}</strong> al mes<template
              v-if="estimate.minimumApplied"
            >
              (el mínimo mensual)</template
            >.
          </p>
          <p class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Tarifa única, sin IVA. Mínimo {{ formatCop(MINIMUM_MONTHLY) }} al mes (hasta
            {{ MINIMUM_COVERS_UNITS.toLocaleString('es-CO') }} unidades).
          </p>
        </div>

        <UiLabel title="Tu nombre completo" required :error="errors.fullName">
          <UiInput v-model="form.fullName" autocomplete="name" required block />
        </UiLabel>
        <div class="grid gap-4 sm:grid-cols-2">
          <UiLabel title="Correo electrónico" required :error="errors.email">
            <UiInput
              v-model="form.email"
              type="email"
              autocomplete="email"
              required
              block
              :readonly="!!google"
            />
          </UiLabel>
          <UiLabel title="Celular" required :error="errors.phone">
            <UiInput
              v-model="form.phone"
              type="tel"
              autocomplete="tel"
              placeholder="300 123 4567"
              required
              block
            />
          </UiLabel>
        </div>
        <UiLabel
          v-if="!google"
          title="Contraseña"
          required
          :error="errors.password"
          :help-text="errors.password ? undefined : 'Mínimo 8 caracteres.'"
        >
          <UiInput
            v-model="form.password"
            type="password"
            minlength="8"
            autocomplete="new-password"
            required
            block
          />
        </UiLabel>

        <UiLegalConsent
          v-model="form.acceptTerms"
          kind="signup"
          :site-url="siteUrl"
          :error="errors.acceptTerms"
        />

        <UiButton type="submit" color="primary" size="lg" block :loading="loading">
          Empezar prueba gratis
        </UiButton>
      </UiForm>
    </div>

    <p class="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-300">
      ¿Ya tienes cuenta?
      <RouterLink to="/login" class="font-semibold text-brand-600 underline dark:text-brand-200">
        Inicia sesión
      </RouterLink>
    </p>
  </AuthShell>
</template>
