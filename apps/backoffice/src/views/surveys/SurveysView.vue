<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { UiBadge, UiButton, UiPagination, UiSkeleton, UiTabs, useToast } from '@aptoph/ui'
import {
  SURVEY_STATUS_LABELS,
  type ApiPaginated,
  type SurveyDetail,
  type SurveyItem,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import SurveyFormModal from '@/components/surveys/SurveyFormModal.vue'
import { surveysApi, type SurveyListStatus } from '@/api/surveys'
import { errorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { SURVEY_STATUS_COLORS, coefficientShare, deadlineLabel, formatPercent } from '@/lib/surveys'
import { useTenantStore } from '@/stores/tenant'

const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()

const status = ref<SurveyListStatus>('active')
const page = ref(1)
const list = ref<ApiPaginated<SurveyItem> | null>(null)
const stats = ref<{ drafts: number; open: number; closed: number } | null>(null)
const loading = ref(false)
const formOpen = ref(false)

const tabs = computed(() => [
  {
    label: 'En curso',
    value: 'active',
    badge: stats.value ? stats.value.open + stats.value.drafts : undefined,
  },
  { label: 'Abiertas', value: 'open', badge: stats.value?.open || undefined },
  ...(tenant.canManage
    ? [{ label: 'Borradores', value: 'draft', badge: stats.value?.drafts || undefined }]
    : []),
  { label: 'Histórico', value: 'closed' },
  { label: 'Todas', value: '' },
])

async function load() {
  loading.value = true
  try {
    const [rows, counts] = await Promise.all([
      surveysApi.list({ status: status.value, page: page.value }),
      surveysApi.stats(),
    ])
    list.value = rows
    stats.value = counts.data
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

watch(status, () => {
  page.value = 1
  load()
})

function onSaved(survey: SurveyDetail) {
  router.push({ name: 'survey', params: { id: survey.id } })
}

onMounted(load)
</script>

<template>
  <PageHeader
    title="Encuestas"
    subtitle="Conoce la opinión de los propietarios antes de las asambleas: una respuesta por unidad, con su coeficiente"
  >
    <template v-if="tenant.canManage" #actions>
      <UiButton color="primary" icon="mdi-plus" @click="formOpen = true">Nueva encuesta</UiButton>
    </template>
  </PageHeader>

  <UiTabs v-model="status" :tabs="tabs" class="mb-4" aria-label="Estado" />

  <div v-if="loading && !list" class="space-y-3" aria-busy="true">
    <UiSkeleton v-for="n in 3" :key="n" height="6rem" variant="rounded" />
  </div>

  <EmptyState
    v-else-if="list && !list.data.length"
    class="rounded-2xl bg-white ring-1 ring-brand-900/5 dark:bg-neutral-900 dark:ring-white/10"
    :title="status === 'closed' ? 'Aún no hay encuestas cerradas' : 'No hay encuestas aquí'"
    :description="
      tenant.canManage
        ? 'Crea una encuesta con sus preguntas y opciones, define la fecha límite y publícala para que los propietarios respondan desde el portal.'
        : 'Cuando la administración publique una encuesta, verás aquí su participación y resultados.'
    "
  />

  <ul v-else-if="list" class="space-y-3" :aria-busy="loading">
    <li v-for="survey in list.data" :key="survey.id">
      <RouterLink
        :to="{ name: 'survey', params: { id: survey.id } }"
        class="flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-900/5 transition hover:ring-mint-500/40 sm:flex-row sm:items-center dark:bg-neutral-900 dark:ring-white/10"
      >
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <UiBadge
              :label="SURVEY_STATUS_LABELS[survey.status]"
              :color="SURVEY_STATUS_COLORS[survey.status]"
              variant="soft"
              size="sm"
            />
            <UiBadge
              :label="survey.anonymous ? 'Anónima' : 'Nominal'"
              :icon="survey.anonymous ? 'mdi-incognito' : 'mdi-account-eye-outline'"
              variant="outline"
              size="sm"
            />
          </div>
          <p class="mt-1.5 truncate font-semibold">{{ survey.title }}</p>
          <p class="text-xs text-neutral-500">
            {{ survey.questionCount }} {{ survey.questionCount === 1 ? 'pregunta' : 'preguntas' }} ·
            <template v-if="survey.status === 'draft'"
              >Cierre previsto {{ formatDateTime(survey.closesAt) }}</template
            >
            <template v-else
              >{{ deadlineLabel(survey.closesAt) }} ·
              {{ formatDateTime(survey.closesAt) }}</template
            >
          </p>
        </div>
        <div v-if="survey.participation" class="w-full shrink-0 sm:w-64">
          <div class="mb-1 flex justify-between text-xs">
            <span class="text-neutral-500"
              >{{ survey.participation.votedUnits }} de
              {{ survey.participation.eligibleUnits }} unidades</span
            >
            <span class="font-semibold tabular-nums">{{
              formatPercent(coefficientShare(survey.participation))
            }}</span>
          </div>
          <div class="relative h-2 rounded-full bg-neutral-100 dark:bg-white/10">
            <div
              class="h-2 rounded-full"
              :class="survey.participation.reached ? 'bg-mint-500' : 'bg-amber-500'"
              :style="{ width: `${Math.min(100, coefficientShare(survey.participation))}%` }"
            />
            <div
              v-if="survey.participation.minParticipation"
              class="absolute -top-1 h-4 w-0.5 bg-neutral-700 dark:bg-white"
              :style="{ left: `${survey.participation.minParticipation}%` }"
            />
          </div>
          <p class="mt-1 text-xs text-neutral-500">Participación por coeficiente</p>
        </div>
        <i
          class="mdi mdi-chevron-right hidden text-xl text-neutral-400 sm:block"
          aria-hidden="true"
        />
      </RouterLink>
    </li>
  </ul>

  <UiPagination
    v-if="list && list.metadata.lastPage > 1"
    class="mt-4"
    :page="list.metadata.currentPage"
    :per-page="list.metadata.perPage"
    :total="list.metadata.total"
    @paginate="(p: number) => ((page = p), load())"
  />

  <SurveyFormModal v-model="formOpen" :survey="null" @saved="onSaved" />
</template>
