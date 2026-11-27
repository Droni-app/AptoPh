<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiAlert,
  UiButton,
  UiForm,
  UiInput,
  UiLabel,
  UiLegalConsent,
  UiSkeleton,
  useToast,
} from '@aptoph/ui'
import { BACKOFFICE_ROLES, type InvitationPreview } from '@aptoph/shared'
import AuthShell from '@/components/AuthShell.vue'
import { publicAuthApi } from '@/api/account'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { ApiError } from '@/lib/http'
import { errorMessage, fieldErrors } from '@/lib/errors'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tenant = useTenantStore()
const toast = useToast()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const invitation = ref<InvitationPreview | null>(null)
const loadError = ref<string | null>(null)
const form = ref({ fullName: '', password: '', confirmation: '', acceptTerms: false })
const siteUrl = import.meta.env.VITE_SITE_URL
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const loading = ref(false)

/** Resident invitations only; staff invitations belong to the back-office */
const isStaff = computed(
  () => invitation.value !== null && BACKOFFICE_ROLES.includes(invitation.value.role),
)

onMounted(async () => {
  if (!token.value) {
    loadError.value = 'El enlace está incompleto. Ábrelo de nuevo desde el correo.'
    return
  }
  try {
    invitation.value = (await publicAuthApi.invitation(token.value)).data
    form.value.fullName = invitation.value.fullName
  } catch (e) {
    loadError.value = e instanceof ApiError && e.status === 404 ? e.message : errorMessage(e)
  }
})

async function accept() {
  if (!invitation.value) return
  errors.value = {}
  error.value = null
  if (invitation.value.needsPassword && form.value.password !== form.value.confirmation) {
    errors.value = { confirmation: 'Las contraseñas no coinciden' }
    return
  }
  if (!form.value.acceptTerms) {
    errors.value = { acceptTerms: 'Para continuar acepta los términos y la política de datos' }
    return
  }
  loading.value = true
  try {
    const { data } = await publicAuthApi.acceptInvitation({
      token: token.value,
      acceptTerms: form.value.acceptTerms,
      device: auth.device,
      ...(invitation.value.needsPassword
        ? { fullName: form.value.fullName, password: form.value.password }
        : {}),
    })
    auth.start(data)
    tenant.reset()
    await tenant.load()
    tenant.select(data.tenantId)
    toast.success(`Ya tienes acceso a ${invitation.value.tenant.name}`)
    await router.replace('/')
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? null : errorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell>
    <div v-if="!invitation && !loadError" aria-busy="true" class="flex flex-col gap-3">
      <UiSkeleton width="70%" height="2.5rem" />
      <UiSkeleton height="6rem" variant="rounded" />
    </div>

    <template v-else-if="loadError">
      <h1
        class="text-[2rem] leading-tight font-extrabold tracking-tight text-brand-700 dark:text-white"
      >
        Invitación no disponible
      </h1>
      <UiAlert color="danger" variant="soft" class="mt-6" role="alert">{{ loadError }}</UiAlert>
      <UiButton class="mt-6" variant="outline" block to="/login">Ir a iniciar sesión</UiButton>
    </template>

    <template v-else-if="invitation">
      <p class="text-sm font-semibold text-mint-700 dark:text-mint-300">
        Invitación · {{ invitation.roleLabel }}
      </p>
      <h1
        class="mt-1 text-[2rem] leading-tight font-extrabold tracking-tight text-brand-700 dark:text-white"
      >
        Te invitaron a {{ invitation.tenant.name }}
      </h1>
      <p class="mt-2 text-neutral-600 dark:text-neutral-300">
        <template v-if="invitation.invitedBy">{{ invitation.invitedBy }} te dio acceso</template>
        <template v-else>Tienes acceso</template>
        al portal de residentes de {{ invitation.tenant.name }} con el correo
        <strong>{{ invitation.email }}</strong
        >.
        <template v-if="invitation.title"> Cargo: {{ invitation.title }}.</template>
      </p>

      <UiAlert v-if="isStaff" color="warning" variant="soft" class="mt-6">
        Esta invitación es para el panel de administración. Ábrela desde el enlace del correo.
      </UiAlert>

      <UiForm v-else class="mt-8" :loading="loading" @submit="accept">
        <UiAlert v-if="error" color="danger" variant="soft" role="alert">{{ error }}</UiAlert>
        <template v-if="invitation.needsPassword">
          <UiLabel title="Tu nombre completo" :error="errors.fullName">
            <UiInput v-model="form.fullName" autocomplete="name" required block />
          </UiLabel>
          <UiLabel
            title="Crea una contraseña"
            help-text="Mínimo 8 caracteres."
            :error="errors.password"
          >
            <UiInput
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
              block
            />
          </UiLabel>
          <UiLabel title="Repite la contraseña" :error="errors.confirmation">
            <UiInput
              v-model="form.confirmation"
              type="password"
              autocomplete="new-password"
              required
              block
            />
          </UiLabel>
        </template>
        <p v-else class="text-sm text-neutral-600 dark:text-neutral-300">
          Ya tienes una cuenta en AptoPH: después de aceptar entrarás con tu contraseña de siempre.
        </p>
        <UiLegalConsent
          v-model="form.acceptTerms"
          kind="invitation"
          :site-url="siteUrl"
          :error="errors.acceptTerms"
        />
        <UiButton type="submit" color="primary" size="lg" block :loading="loading" class="mt-2">
          Aceptar invitación
        </UiButton>
      </UiForm>
    </template>
  </AuthShell>
</template>
