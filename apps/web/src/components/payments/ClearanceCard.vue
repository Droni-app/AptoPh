<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { UiAlert, UiButton, useToast } from '@aptoph/ui'
import type { ClearanceCertificate, ResidentClearanceStatus } from '@aptoph/shared'
import { residentApi } from '@/api/resident'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatMoney, isZero } from '@/lib/format'

/** Paz y salvo of the unit: request it when up to date and download the issued ones */
const props = defineProps<{ unitId: string; currency?: string }>()
const toast = useToast()

const status = ref<ResidentClearanceStatus | null>(null)
const issuing = ref(false)
const downloading = ref<string | null>(null)
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
const money = (amount: string) => formatMoney(amount, props.currency ?? 'COP')

async function load() {
  try {
    status.value = (await residentApi.finance.clearance(props.unitId)).data
  } catch {
    // The rest of the page works without it
  }
}
onMounted(load)
defineExpose({ load })

const current = computed(
  () => status.value?.certificates.find((certificate) => certificate.validUntil >= today) ?? null,
)

async function download(certificate: ClearanceCertificate) {
  downloading.value = certificate.id
  try {
    await residentApi.finance.downloadClearance(certificate)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    downloading.value = null
  }
}

async function issue() {
  issuing.value = true
  try {
    const certificate = (await residentApi.finance.issueClearance(props.unitId)).data
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
  <div
    v-if="status"
    class="mt-4 rounded-2xl border border-neutral-100 bg-white p-4 text-sm dark:border-white/10 dark:bg-neutral-900"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-start gap-3">
        <span
          :class="[
            'grid size-10 shrink-0 place-items-center rounded-xl text-xl',
            status.eligible
              ? 'bg-mint-50 text-mint-700 dark:bg-mint-400/15 dark:text-mint-300'
              : 'bg-neutral-100 text-neutral-500 dark:bg-white/10',
          ]"
          aria-hidden="true"
          ><i class="mdi mdi-certificate-outline"
        /></span>
        <div>
          <p class="font-semibold">Paz y salvo</p>
          <p v-if="current" class="text-neutral-600 dark:text-neutral-300">
            Tienes uno vigente hasta el {{ formatDate(current.validUntil) }} (No.
            {{ current.number }}).
          </p>
          <p v-else-if="status.eligible" class="text-neutral-600 dark:text-neutral-300">
            Estás al día: puedes descargarlo para un trámite, una venta o un arriendo.
          </p>
          <p v-else class="text-neutral-600 dark:text-neutral-300">
            Se expide cuando no tengas saldo vencido (hoy {{ money(status.overdue) }}).
          </p>
        </div>
      </div>
      <UiButton
        v-if="current"
        variant="outline"
        :loading="downloading === current.id"
        @click="download(current)"
        ><i class="mdi mdi-file-pdf-box mr-1" aria-hidden="true" />Descargar</UiButton
      >
      <UiButton
        v-else-if="status.eligible && status.canIssue"
        color="primary"
        :loading="issuing"
        @click="issue"
        ><i class="mdi mdi-download mr-1" aria-hidden="true" />Obtener paz y salvo</UiButton
      >
    </div>
    <UiAlert
      v-if="status.eligible && !current && !status.canIssue"
      color="neutral"
      variant="soft"
      class="mt-3"
    >
      Lo pide el propietario, el arrendatario o el contacto principal de la unidad.
    </UiAlert>
    <p
      v-if="status.eligible && !isZero(status.upcoming) && !current"
      class="mt-2 text-xs text-neutral-500"
    >
      No incluye {{ money(status.upcoming) }} ya facturados que aún no vencen.
    </p>
  </div>
</template>
