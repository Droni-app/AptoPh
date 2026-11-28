<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { UiAlert, UiSkeleton } from '@aptoph/ui'
import type { ClearanceVerification } from '@aptoph/shared'
import AuthShell from '@/components/AuthShell.vue'
import { verifyClearance } from '@/api/resident'
import { ApiError } from '@/lib/http'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatDateTime } from '@/lib/format'

/**
 * Public check of a paz y salvo by the code printed on it (a notary, a buyer,
 * a real estate agency…). Works without a session.
 */
const route = useRoute()
const code = String(route.params.code ?? '')
const result = ref<ClearanceVerification | null>(null)
const missing = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    result.value = (await verifyClearance(code)).data
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) missing.value = true
    else error.value = errorMessage(e, 'No pudimos verificar el certificado')
  }
})
</script>

<template>
  <AuthShell>
    <h1
      class="text-[2rem] leading-tight font-extrabold tracking-tight text-brand-700 dark:text-white"
    >
      Verificación de paz y salvo
    </h1>
    <p class="mt-2 text-neutral-600 dark:text-neutral-300">
      Código <strong class="tracking-wide">{{ code.toUpperCase() }}</strong>
    </p>

    <UiAlert v-if="error" color="danger" variant="soft" class="mt-6">{{ error }}</UiAlert>
    <UiAlert v-else-if="missing" color="danger" variant="soft" class="mt-6" role="alert">
      No existe un paz y salvo con este código. Revisa que esté bien escrito; si es así, el
      documento no fue expedido por AptoPH.
    </UiAlert>
    <UiSkeleton v-else-if="!result" class="mt-6 h-48 rounded-2xl" />
    <template v-else>
      <UiAlert
        :color="result.current ? 'success' : 'warning'"
        variant="soft"
        class="mt-6"
        role="status"
      >
        {{
          result.current
            ? `Auténtico y vigente hasta el ${formatDate(result.validUntil)}.`
            : `Auténtico, pero venció el ${formatDate(result.validUntil)}. Pide uno nuevo a la administración.`
        }}
      </UiAlert>
      <dl
        class="mt-6 grid gap-4 rounded-2xl border border-neutral-100 bg-white p-5 text-sm dark:border-white/10 dark:bg-neutral-900"
      >
        <div>
          <dt class="text-neutral-500">Conjunto</dt>
          <dd class="font-semibold">{{ result.tenant }}</dd>
        </div>
        <div>
          <dt class="text-neutral-500">Unidad</dt>
          <dd class="font-semibold">{{ result.unit }}</dd>
        </div>
        <div v-if="result.holderName">
          <dt class="text-neutral-500">A nombre de</dt>
          <dd class="font-semibold">{{ result.holderName }}</dd>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <dt class="text-neutral-500">Número</dt>
            <dd class="font-semibold">{{ result.number }}</dd>
          </div>
          <div>
            <dt class="text-neutral-500">Al día con corte al</dt>
            <dd class="font-semibold">{{ formatDate(result.asOf) }}</dd>
          </div>
        </div>
        <div>
          <dt class="text-neutral-500">Expedido</dt>
          <dd class="font-semibold">{{ formatDateTime(result.issuedAt) }}</dd>
        </div>
      </dl>
    </template>
  </AuthShell>
</template>
