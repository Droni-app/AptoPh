<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { UiAlert, UiButton, UiSkeleton } from '@aptoph/ui'
import type { ResidentAnnouncement } from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { residentApi } from '@/api/resident'
import { errorMessage } from '@/lib/errors'
import { formatRelative } from '@/lib/format'

const announcements = ref<ResidentAnnouncement[] | null>(null)
const error = ref<string | null>(null)

async function load() {
  error.value = null
  try {
    announcements.value = (await residentApi.announcements.list()).data
  } catch (e) {
    error.value = errorMessage(e, 'No pudimos cargar los comunicados')
  }
}

onMounted(load)
</script>

<template>
  <PageHeader
    title="Comunicados"
    subtitle="Circulares y avisos de la administración"
    art="comunicados"
  />

  <div v-if="error" class="flex flex-col items-start gap-4">
    <UiAlert color="danger" variant="soft" class="w-full">{{ error }}</UiAlert>
    <UiButton variant="outline" @click="load">Reintentar</UiButton>
  </div>

  <div v-else-if="!announcements" class="flex flex-col gap-3" aria-busy="true">
    <UiSkeleton v-for="n in 3" :key="n" height="5rem" variant="rounded" />
  </div>

  <EmptyState
    v-else-if="announcements.length === 0"
    class="rounded-2xl border border-neutral-100 bg-white dark:border-white/10 dark:bg-neutral-900"
    art="sin-mensajes"
    title="No hay comunicados"
    description="Cuando la administración publique uno, lo verás aquí."
  />

  <ul
    v-else
    class="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-neutral-900"
  >
    <li v-for="item in announcements" :key="item.id">
      <RouterLink
        :to="{ name: 'announcement', params: { id: item.id } }"
        class="flex items-start gap-3 p-4 transition hover:bg-neutral-50/60 focus-visible:outline-2 focus-visible:outline-mint-600 dark:hover:bg-white/5"
      >
        <span
          class="mt-2 size-2 shrink-0 rounded-full"
          :class="item.readAt ? 'bg-transparent' : 'bg-mint-500'"
          :aria-label="item.readAt ? undefined : 'Sin leer'"
          :role="item.readAt ? undefined : 'img'"
        />
        <div class="min-w-0 flex-1">
          <p class="flex items-center gap-1.5" :class="item.readAt ? 'font-medium' : 'font-bold'">
            <i
              v-if="item.isPinned"
              class="mdi mdi-pin text-amber-500"
              role="img"
              aria-label="Fijado"
            />
            <span class="truncate">{{ item.title }}</span>
          </p>
          <p
            v-if="item.excerpt"
            class="mt-0.5 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-300"
          >
            {{ item.excerpt }}
          </p>
          <p class="mt-1 flex gap-3 text-xs text-neutral-400">
            <span>{{ formatRelative(item.publishedAt) }}</span>
            <span v-if="item.image"
              ><i class="mdi mdi-image-outline" aria-hidden="true" /> Imagen</span
            >
            <span v-if="item.attachmentCount"
              ><i class="mdi mdi-paperclip" aria-hidden="true" />
              {{
                item.attachmentCount === 1 ? '1 adjunto' : `${item.attachmentCount} adjuntos`
              }}</span
            >
          </p>
        </div>
        <img
          v-if="item.image"
          :src="item.image.url"
          alt=""
          loading="lazy"
          class="size-16 shrink-0 rounded-lg border border-neutral-100 bg-neutral-100 object-cover dark:border-white/10 dark:bg-white/5"
        />
      </RouterLink>
    </li>
  </ul>
</template>
