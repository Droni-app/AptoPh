<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { DuiAlert, DuiButton, DuiCard, DuiSkeleton, useToast } from '@dronico/droni-kit'
import {
  attachmentIcon,
  formatFileSize,
  type Attachment,
  type ResidentAnnouncementDetail,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import { residentApi } from '@/api/resident'
import { downloadSigned, openSigned } from '@/lib/attachments'
import { ApiError } from '@/lib/http'
import { errorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'

const route = useRoute()
const toast = useToast()
const announcement = ref<ResidentAnnouncementDetail | null>(null)
const error = ref<string | null>(null)
const notFound = ref(false)

async function load() {
  error.value = null
  try {
    announcement.value = (await residentApi.announcements.show(String(route.params.id))).data
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound.value = true
    else error.value = errorMessage(e, 'No pudimos cargar el comunicado')
  }
}

const paragraphs = computed(() =>
  (announcement.value?.body ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean),
)

async function open(file: Attachment, download = false) {
  const signed = () => residentApi.announcements.attachmentUrl(file.id, download)
  try {
    await (download ? downloadSigned(signed) : openSigned(signed))
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

onMounted(load)
</script>

<template>
  <RouterLink
    :to="{ name: 'announcements' }"
    class="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-mint-700 hover:underline dark:text-neutral-300 dark:hover:text-mint-300"
  >
    <span aria-hidden="true"><i class="mdi mdi-arrow-left" /></span> Comunicados
  </RouterLink>

  <DuiCard v-if="notFound">
    <p class="py-6 text-center font-medium">Este comunicado no existe o ya no está disponible.</p>
  </DuiCard>

  <div v-else-if="error" class="flex flex-col items-start gap-4">
    <DuiAlert color="danger" variant="soft" class="w-full">{{ error }}</DuiAlert>
    <DuiButton variant="outline" @click="load">Reintentar</DuiButton>
  </div>

  <DuiSkeleton v-else-if="!announcement" height="16rem" variant="rounded" />

  <template v-else>
    <PageHeader :title="announcement.title" :subtitle="formatDateTime(announcement.publishedAt)" />
    <article
      class="flex max-w-3xl flex-col gap-4 rounded-2xl border border-neutral-100 bg-white p-5 leading-relaxed sm:p-6 dark:border-white/10 dark:bg-neutral-900"
    >
      <p v-for="(paragraph, i) in paragraphs" :key="i" class="whitespace-pre-line">
        {{ paragraph }}
      </p>
    </article>

    <section v-if="announcement.attachments.length" class="mt-6 max-w-3xl">
      <h2 class="mb-2 font-semibold">Adjuntos</h2>
      <ul
        class="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-neutral-900"
      >
        <li
          v-for="file in announcement.attachments"
          :key="file.id"
          class="flex items-center gap-3 p-3"
        >
          <i
            class="mdi text-2xl text-neutral-500"
            :class="attachmentIcon(file.fileName)"
            aria-hidden="true"
          />
          <button type="button" class="min-w-0 flex-1 text-left" @click="open(file)">
            <span class="block truncate font-medium hover:underline">{{ file.fileName }}</span>
            <span class="block text-xs text-neutral-500">{{ formatFileSize(file.sizeBytes) }}</span>
          </button>
          <DuiButton
            variant="ghost"
            size="sm"
            :aria-label="`Descargar ${file.fileName}`"
            @click="open(file, true)"
          >
            <i class="mdi mdi-download" aria-hidden="true" />
          </DuiButton>
        </li>
      </ul>
    </section>
  </template>
</template>
