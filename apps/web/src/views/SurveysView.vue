<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { UiAlert, UiBadge, UiButton, UiSkeleton } from '@aptoph/ui'
import type { ResidentSurveyItem } from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { residentApi } from '@/api/resident'
import { errorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { deadlineLabel } from '@/lib/surveys'

const surveys = ref<ResidentSurveyItem[] | null>(null)
const isOwner = ref(true)
const error = ref<string | null>(null)

async function load() {
  error.value = null
  try {
    const response = await residentApi.surveys.list()
    surveys.value = response.data
    isOwner.value = response.isOwner
  } catch (e) {
    error.value = errorMessage(e, 'No pudimos cargar las encuestas')
  }
}

const open = computed(() => surveys.value?.filter((s) => s.status === 'open') ?? [])
const history = computed(() => surveys.value?.filter((s) => s.status === 'closed') ?? [])
const pending = computed(() => open.value.filter((s) => s.canVote).length)

const unitsLabel = (s: ResidentSurveyItem) => {
  const voted = s.units.filter((u) => u.votedAt).length
  if (!voted) return null
  return s.units.length === 1
    ? 'Tu unidad ya respondió'
    : `Respondieron ${voted} de tus ${s.units.length} unidades`
}

onMounted(load)
</script>

<template>
  <PageHeader
    title="Encuestas"
    subtitle="Tu opinión sobre los temas del conjunto antes de las asambleas"
  />

  <div v-if="error" class="flex flex-col items-start gap-4">
    <UiAlert color="danger" variant="soft" class="w-full">{{ error }}</UiAlert>
    <UiButton variant="outline" @click="load">Reintentar</UiButton>
  </div>

  <div v-else-if="!surveys" class="flex flex-col gap-3" aria-busy="true">
    <UiSkeleton v-for="n in 3" :key="n" height="5.5rem" variant="rounded" />
  </div>

  <EmptyState
    v-else-if="!isOwner"
    class="rounded-2xl border border-neutral-100 bg-white dark:border-white/10 dark:bg-neutral-900"
    title="Las encuestas son para los propietarios"
    description="Como en la asamblea, cada unidad responde a través de su propietario. Si eres propietario y no ves las encuestas, pide a la administración que actualice tu registro."
  />

  <EmptyState
    v-else-if="!surveys.length"
    class="rounded-2xl border border-neutral-100 bg-white dark:border-white/10 dark:bg-neutral-900"
    art="sin-mensajes"
    title="No hay encuestas todavía"
    description="Cuando la administración publique una, te avisaremos para que des tu opinión."
  />

  <template v-else>
    <section class="mb-8">
      <h2 class="mb-3 flex items-center gap-2 text-base font-semibold">
        Abiertas
        <UiBadge
          v-if="pending"
          :label="`${pending} por responder`"
          color="warning"
          variant="soft"
          size="sm"
        />
      </h2>
      <p
        v-if="!open.length"
        class="rounded-2xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500 dark:border-white/15"
      >
        No hay encuestas abiertas en este momento.
      </p>
      <ul v-else class="grid gap-3 md:grid-cols-2">
        <li v-for="survey in open" :key="survey.id">
          <RouterLink
            :to="{ name: 'survey', params: { id: survey.id } }"
            class="flex h-full flex-col gap-3 rounded-2xl border bg-white p-5 transition hover:border-mint-500/60 dark:bg-neutral-900"
            :class="
              survey.canVote
                ? 'border-mint-500/40 dark:border-mint-400/30'
                : 'border-neutral-100 dark:border-white/10'
            "
          >
            <div class="flex items-start justify-between gap-3">
              <p class="font-semibold">{{ survey.title }}</p>
              <i
                class="mdi mdi-vote-outline text-2xl text-mint-600 dark:text-mint-400"
                aria-hidden="true"
              />
            </div>
            <p
              v-if="survey.description"
              class="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300"
            >
              {{ survey.description }}
            </p>
            <div class="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs">
              <span class="text-neutral-500"
                ><i class="mdi mdi-clock-outline" aria-hidden="true" />
                {{ deadlineLabel(survey.closesAt) }} · {{ survey.questionCount }}
                {{ survey.questionCount === 1 ? 'pregunta' : 'preguntas' }}</span
              >
              <span v-if="survey.canVote" class="font-semibold text-mint-700 dark:text-mint-300"
                >Responder <i class="mdi mdi-arrow-right" aria-hidden="true"
              /></span>
              <span v-else class="font-medium text-neutral-600 dark:text-neutral-300"
                ><i class="mdi mdi-check-circle text-mint-600" aria-hidden="true" />
                {{ unitsLabel(survey) }}</span
              >
            </div>
            <p v-if="survey.canVote && unitsLabel(survey)" class="text-xs text-neutral-500">
              {{ unitsLabel(survey) }}
            </p>
          </RouterLink>
        </li>
      </ul>
    </section>

    <section v-if="history.length">
      <h2 class="mb-3 text-base font-semibold">Histórico</h2>
      <ul
        class="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-neutral-900"
      >
        <li v-for="survey in history" :key="survey.id">
          <RouterLink
            :to="{ name: 'survey', params: { id: survey.id } }"
            class="flex items-center gap-3 p-4 transition hover:bg-neutral-50/60 dark:hover:bg-white/5"
          >
            <span
              class="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-xl text-neutral-500 dark:bg-white/10"
            >
              <i class="mdi mdi-chart-bar" aria-hidden="true" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium">{{ survey.title }}</span>
              <span class="block text-xs text-neutral-500"
                >Cerró el {{ formatDateTime(survey.closesAt) }}
                <template v-if="unitsLabel(survey)"> · {{ unitsLabel(survey) }}</template>
                <template v-else> · Tu unidad no respondió</template></span
              >
            </span>
            <span class="hidden text-sm font-medium text-mint-700 sm:inline dark:text-mint-300"
              >Ver resultados</span
            >
            <i class="mdi mdi-chevron-right text-neutral-400" aria-hidden="true" />
          </RouterLink>
        </li>
      </ul>
    </section>
  </template>
</template>
