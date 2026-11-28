<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { UiAlert, UiButton, UiCard, UiSkeleton, useToast } from '@aptoph/ui'
import type { ClearanceCertificate, ClearanceStatus } from '@aptoph/shared'
import { financeApi } from '@/api/finance'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoney, todayInput } from '@/lib/format'
import { useTenantStore } from '@/stores/tenant'

/** Paz y salvo of a unit: whether it can get one now, issue it and download the issued ones */
const props = defineProps<{ unitId: string }>()
const tenant = useTenantStore()
const toast = useToast()

const status = ref<ClearanceStatus | null>(null)
const error = ref<string | null>(null)
const issuing = ref(false)
const downloading = ref<string | null>(null)
const today = todayInput()

async function load() {
  try {
    status.value = (await financeApi.clearance(props.unitId)).data
    error.value = null
  } catch (e) {
    error.value = errorMessage(e)
  }
}
onMounted(load)
defineExpose({ load })

async function download(certificate: ClearanceCertificate) {
  downloading.value = certificate.id
  try {
    await financeApi.downloadClearance(certificate)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    downloading.value = null
  }
}

async function issue() {
  issuing.value = true
  try {
    const certificate = (await financeApi.issueClearance(props.unitId)).data
    toast.success(`Paz y salvo ${certificate.number} expedido`)
    await load()
    await download(certificate)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    issuing.value = false
  }
}
</script>

<template>
  <UiCard class="mb-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">Paz y salvo</h2>
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Certificado numerado con código de verificación. Se expide cuando la unidad no tiene
          saldo vencido y es válido hasta fin de mes o hasta el siguiente vencimiento.
        </p>
      </div>
      <UiButton
        v-if="tenant.canManageFinance && status"
        color="primary"
        :disabled="!status.eligible"
        :loading="issuing"
        @click="issue"
        ><i class="mdi mdi-certificate-outline mr-1" aria-hidden="true" />Expedir paz y
        salvo</UiButton
      >
    </div>

    <UiAlert v-if="error" color="danger" variant="soft" class="mt-4">{{ error }}</UiAlert>
    <UiSkeleton v-else-if="!status" class="mt-4 h-16 rounded-xl" />
    <template v-else>
      <UiAlert v-if="!status.eligible" color="warning" variant="soft" class="mt-4">
        Tiene un saldo vencido de {{ formatMoney(status.overdue) }}. Cuando lo pague se puede
        expedir.
      </UiAlert>
      <UiAlert v-else-if="Number(status.upcoming) > 0" color="secondary" variant="soft" class="mt-4">
        Está al día. El certificado indicará que no cubre {{ formatMoney(status.upcoming) }} ya
        facturados que aún no vencen.
      </UiAlert>

      <ul
        v-if="status.certificates.length"
        class="mt-4 divide-y divide-neutral-100 text-sm dark:divide-white/10"
      >
        <li
          v-for="certificate in status.certificates"
          :key="certificate.id"
          class="flex flex-wrap items-center justify-between gap-3 py-2"
        >
          <span>
            <span class="font-medium">No. {{ certificate.number }}</span>
            · {{ formatDate(certificate.asOf) }}
            <span class="text-neutral-500">· código {{ certificate.code }}</span>
            <span v-if="certificate.issuedBy" class="text-neutral-500">
              · {{ certificate.issuedBy }}</span
            >
          </span>
          <span class="flex items-center gap-3">
            <span
              :class="
                certificate.validUntil >= today
                  ? 'text-mint-700 dark:text-mint-300'
                  : 'text-neutral-500'
              "
              >{{
                certificate.validUntil >= today
                  ? `Vigente hasta ${formatDate(certificate.validUntil)}`
                  : 'Vencido'
              }}</span
            >
            <UiButton
              size="sm"
              variant="ghost"
              :loading="downloading === certificate.id"
              @click="download(certificate)"
              ><i class="mdi mdi-file-pdf-box mr-1" aria-hidden="true" />PDF</UiButton
            >
          </span>
        </li>
      </ul>
      <p v-else class="mt-4 text-sm text-neutral-500">No se ha expedido ninguno.</p>
    </template>
  </UiCard>
</template>
