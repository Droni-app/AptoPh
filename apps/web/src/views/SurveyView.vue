<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { UiAlert, UiBadge, UiButton, UiModal, UiSkeleton, useToast } from '@aptoph/ui'
import { SURVEY_STATUS_LABELS, type ResidentSurveyDetail } from '@aptoph/shared'
import SurveyResults from '@/components/surveys/SurveyResults.vue'
import { residentApi } from '@/api/resident'
import { errorMessage } from '@/lib/errors'
import { formatDateTime, unitName } from '@/lib/format'
import { deadlineLabel, formatPercent } from '@/lib/surveys'

const route = useRoute()
const toast = useToast()

const survey = ref<ResidentSurveyDetail | null>(null)
const error = ref<string | null>(null)
const answers = ref<Record<string, string>>({})
const unitIds = ref<string[]>([])
const confirming = ref(false)
const sending = ref(false)
const missing = ref<string[]>([])

async function load() {
  error.value = null
  try {
    const { data } = await residentApi.surveys.show(String(route.params.id))
    survey.value = data
    unitIds.value = data.units.filter((u) => !u.votedAt).map((u) => u.unit.id)
  } catch (e) {
    error.value = errorMessage(e, 'No encontramos esa encuesta')
  }
}

const pendingUnits = computed(() => survey.value?.units.filter((u) => !u.votedAt) ?? [])
const votedUnits = computed(() => survey.value?.units.filter((u) => u.votedAt) ?? [])
const answered = computed(() => Object.keys(answers.value).length)

function toggleUnit(id: string) {
  const index = unitIds.value.indexOf(id)
  if (index >= 0) unitIds.value.splice(index, 1)
  else unitIds.value.push(id)
}

function review() {
  const s = survey.value!
  missing.value = s.questions.filter((q) => !answers.value[q.id]).map((q) => q.id)
  if (missing.value.length) {
    document
      .getElementById(`q-${missing.value[0]}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  if (!unitIds.value.length) {
    toast.error('Elige por qué unidad respondes')
    return
  }
  confirming.value = true
}

async function send() {
  sending.value = true
  try {
    const { data } = await residentApi.surveys.vote(survey.value!.id, {
      unitIds: unitIds.value,
      answers: answers.value,
    })
    survey.value = data
    confirming.value = false
    answers.value = {}
    unitIds.value = data.units.filter((u) => !u.votedAt).map((u) => u.unit.id)
    toast.success('¡Gracias! Tu respuesta quedó registrada')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    toast.error(errorMessage(e))
    confirming.value = false
    load()
  } finally {
    sending.value = false
  }
}

const optionLabel = (questionId: string) =>
  survey.value?.questions
    .find((q) => q.id === questionId)
    ?.options.find((o) => o.id === answers.value[questionId])?.label

onMounted(load)
</script>

<template>
  <RouterLink
    :to="{ name: 'surveys' }"
    class="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
  >
    <i class="mdi mdi-arrow-left" aria-hidden="true" />Encuestas
  </RouterLink>

  <div v-if="error" class="flex flex-col items-start gap-4">
    <UiAlert color="danger" variant="soft" class="w-full">{{ error }}</UiAlert>
    <UiButton variant="outline" :to="{ name: 'surveys' }">Volver a las encuestas</UiButton>
  </div>

  <div v-else-if="!survey" class="space-y-4" aria-busy="true">
    <UiSkeleton height="3rem" width="70%" />
    <UiSkeleton height="12rem" variant="rounded" />
  </div>

  <article v-else class="mx-auto max-w-3xl">
    <header class="mb-6">
      <div class="mb-2 flex flex-wrap items-center gap-2">
        <UiBadge
          :label="SURVEY_STATUS_LABELS[survey.status]"
          :color="survey.status === 'open' ? 'success' : 'neutral'"
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
      <h1 class="text-2xl font-bold">{{ survey.title }}</h1>
      <p class="mt-1 text-sm text-neutral-500">
        <i class="mdi mdi-clock-outline" aria-hidden="true" />
        {{ deadlineLabel(survey.closesAt) }} · {{ formatDateTime(survey.closesAt) }}
      </p>
      <p
        v-if="survey.description"
        class="mt-4 text-sm whitespace-pre-line text-neutral-700 dark:text-neutral-300"
      >
        {{ survey.description }}
      </p>
      <p class="mt-3 text-xs text-neutral-500">
        <template v-if="survey.anonymous"
          ><i class="mdi mdi-incognito" aria-hidden="true" /> Nadie, ni la administración, sabrá qué
          respondiste: solo se guardan los totales.</template
        >
        <template v-else
          ><i class="mdi mdi-account-eye-outline" aria-hidden="true" /> Encuesta nominal: la
          administración y el consejo verán lo que responde cada unidad.</template
        >
      </p>
    </header>

    <!-- Units that already answered -->
    <UiAlert
      v-if="votedUnits.length"
      color="success"
      variant="soft"
      icon="mdi-check-circle-outline"
      class="mb-6"
    >
      <span v-for="(u, i) in votedUnits" :key="u.unit.id" class="block">
        {{ unitName(u.unit) }} respondió<template v-if="u.votedBy"> ({{ u.votedBy }})</template> el
        {{ formatDateTime(u.votedAt!) }}<template v-if="i < votedUnits.length - 1">.</template>
      </span>
    </UiAlert>

    <!-- Vote -->
    <form v-if="survey.canVote" class="space-y-4" @submit.prevent="review">
      <fieldset
        v-for="(q, index) in survey.questions"
        :id="`q-${q.id}`"
        :key="q.id"
        class="rounded-2xl border bg-white p-5 dark:bg-neutral-900"
        :class="
          missing.includes(q.id) && !answers[q.id]
            ? 'border-coral-400'
            : 'border-neutral-100 dark:border-white/10'
        "
      >
        <legend class="sr-only">{{ q.text }}</legend>
        <p class="font-medium" aria-hidden="true">{{ index + 1 }}. {{ q.text }}</p>
        <p v-if="q.description" class="mt-0.5 text-sm text-neutral-500">{{ q.description }}</p>
        <div class="mt-4 grid gap-2">
          <label
            v-for="option in q.options"
            :key="option.id"
            class="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 ring-1 transition"
            :class="
              answers[q.id] === option.id
                ? 'bg-mint-50 ring-2 ring-mint-500 dark:bg-mint-400/10'
                : 'ring-neutral-200 hover:ring-mint-400 dark:ring-white/15'
            "
          >
            <input
              v-model="answers[q.id]"
              type="radio"
              :name="q.id"
              :value="option.id"
              class="size-4 accent-mint-600"
            />
            <span class="text-sm">{{ option.label }}</span>
          </label>
        </div>
        <p v-if="missing.includes(q.id) && !answers[q.id]" class="mt-2 text-xs text-coral-700">
          Responde esta pregunta
        </p>
      </fieldset>

      <div
        v-if="pendingUnits.length > 1"
        class="rounded-2xl border border-neutral-100 bg-white p-5 dark:border-white/10 dark:bg-neutral-900"
      >
        <p class="font-medium">¿Por qué unidades respondes?</p>
        <p class="text-sm text-neutral-500">Cada unidad cuenta como un voto con su coeficiente.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="u in pendingUnits"
            :key="u.unit.id"
            type="button"
            class="rounded-full px-3 py-1.5 text-sm ring-1 transition"
            :class="
              unitIds.includes(u.unit.id)
                ? 'bg-mint-600 text-white ring-mint-600'
                : 'ring-neutral-300 hover:ring-mint-500 dark:ring-white/20'
            "
            :aria-pressed="unitIds.includes(u.unit.id)"
            @click="toggleUnit(u.unit.id)"
          >
            {{ unitName(u.unit) }} · {{ formatPercent(u.coefficient * 100) }}
          </button>
        </div>
      </div>

      <div
        class="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-2xl bg-white/95 p-4 shadow-lg ring-1 ring-neutral-200 backdrop-blur md:bottom-4 dark:bg-neutral-900/95 dark:ring-white/10"
      >
        <span class="text-sm text-neutral-500"
          >{{ answered }} de {{ survey.questions.length }} respondidas</span
        >
        <UiButton type="submit" color="primary" icon="mdi-send-outline">Enviar respuesta</UiButton>
      </div>
    </form>

    <!-- Results -->
    <SurveyResults
      v-if="survey.results"
      :class="survey.canVote ? 'mt-10' : ''"
      :questions="survey.questions"
      :results="survey.results"
    />

    <UiAlert
      v-else-if="!survey.canVote && survey.status === 'open' && votedUnits.length"
      color="neutral"
      variant="soft"
      icon="mdi-lock-clock"
    >
      Los resultados se publican cuando cierre la encuesta, el
      {{ formatDateTime(survey.closesAt) }}.
    </UiAlert>

    <UiAlert v-else-if="!survey.canVote" color="neutral" variant="soft"
      >Esta encuesta ya no recibe respuestas.</UiAlert
    >

    <UiModal v-model="confirming" title="Confirma tu respuesta" size="sm" :persistent="sending">
      <div class="space-y-3 text-sm">
        <p>
          Respondes por
          <strong>{{
            survey.units
              .filter((u) => unitIds.includes(u.unit.id))
              .map((u) => unitName(u.unit))
              .join(', ')
          }}</strong
          >. Tu respuesta es definitiva: no se puede cambiar.
        </p>
        <ol class="space-y-1.5 rounded-xl bg-neutral-50 p-3 dark:bg-white/5">
          <li v-for="(q, i) in survey.questions" :key="q.id">
            <span class="text-neutral-500">{{ i + 1 }}.</span> {{ optionLabel(q.id) }}
          </li>
        </ol>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UiButton variant="ghost" :disabled="sending" @click="confirming = false"
            >Revisar</UiButton
          >
          <UiButton color="primary" :loading="sending" @click="send">Enviar</UiButton>
        </div>
      </template>
    </UiModal>
  </article>
</template>
