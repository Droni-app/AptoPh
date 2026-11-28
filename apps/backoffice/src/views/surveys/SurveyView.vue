<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiModal,
  UiSkeleton,
  UiSwitch,
  UiTabs,
  useToast,
} from '@aptoph/ui'
import {
  SURVEY_RESULTS_VISIBILITY_LABELS,
  SURVEY_STATUS_LABELS,
  type SurveyDetail,
  type SurveyVoter,
} from '@aptoph/shared'
import PageHeader from '@/components/PageHeader.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import SurveyFormModal from '@/components/surveys/SurveyFormModal.vue'
import SurveyResults from '@/components/surveys/SurveyResults.vue'
import { surveysApi } from '@/api/surveys'
import { errorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { SURVEY_STATUS_COLORS, deadlineLabel, formatPercent } from '@/lib/surveys'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()

const survey = ref<SurveyDetail | null>(null)
const voters = ref<SurveyVoter[] | null>(null)
const tab = ref('results')
const busy = ref(false)
const editing = ref(false)
const publishing = ref(false)
const notify = ref(true)
const removing = ref(false)

const id = computed(() => String(route.params.id))

async function load() {
  try {
    survey.value = (await surveysApi.get(id.value)).data
    if (survey.value.status !== 'draft') voters.value = (await surveysApi.voters(id.value)).data
  } catch (e) {
    toast.error(errorMessage(e))
    router.replace({ name: 'surveys' })
  }
}

const tabs = computed(() => [
  { label: 'Resultados', value: 'results' },
  { label: 'Participación', value: 'voters', badge: voters.value?.length || undefined },
])

const optionLabel = (questionId: string, optionId: string) =>
  survey.value?.questions.find((q) => q.id === questionId)?.options.find((o) => o.id === optionId)
    ?.label ?? '—'

async function publish() {
  busy.value = true
  try {
    const { data, notified } = await surveysApi.publish(id.value, notify.value)
    survey.value = data
    voters.value = []
    publishing.value = false
    toast.success(
      notified ? `Encuesta publicada. Se avisó a ${notified} propietarios` : 'Encuesta publicada',
    )
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function remove() {
  busy.value = true
  try {
    await surveysApi.remove(id.value)
    toast.success('Borrador eliminado')
    router.replace({ name: 'surveys' })
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

const unitLabel = (v: SurveyVoter) =>
  v.unit.building ? `${v.unit.building.name} · ${v.unit.code}` : v.unit.code

onMounted(load)
</script>

<template>
  <div v-if="!survey" class="space-y-4" aria-busy="true">
    <UiSkeleton height="3rem" width="60%" />
    <UiSkeleton height="10rem" variant="rounded" />
  </div>

  <template v-else>
    <PageHeader :title="survey.title">
      <template #before>
        <RouterLink
          :to="{ name: 'surveys' }"
          class="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
        >
          <i class="mdi mdi-arrow-left" aria-hidden="true" />Encuestas
        </RouterLink>
      </template>
      <template v-if="tenant.canManage && survey.status === 'draft'" #actions>
        <UiButton variant="ghost" color="danger" icon="mdi-delete-outline" @click="removing = true"
          >Eliminar</UiButton
        >
        <UiButton variant="outline" icon="mdi-pencil-outline" @click="editing = true"
          >Editar</UiButton
        >
        <UiButton color="primary" icon="mdi-send-outline" @click="publishing = true"
          >Publicar</UiButton
        >
      </template>
    </PageHeader>

    <div class="mb-6 flex flex-wrap items-center gap-2 text-sm">
      <UiBadge
        :label="SURVEY_STATUS_LABELS[survey.status]"
        :color="SURVEY_STATUS_COLORS[survey.status]"
        variant="soft"
      />
      <UiBadge
        :label="survey.anonymous ? 'Anónima' : 'Nominal'"
        :icon="survey.anonymous ? 'mdi-incognito' : 'mdi-account-eye-outline'"
        variant="outline"
      />
      <span class="text-neutral-500">
        <i class="mdi mdi-calendar-clock" aria-hidden="true" />
        <template v-if="survey.status === 'draft'">
          Cierre previsto {{ formatDateTime(survey.closesAt) }}</template
        >
        <template v-else>
          {{ deadlineLabel(survey.closesAt) }} ({{ formatDateTime(survey.closesAt) }})</template
        >
      </span>
      <span class="text-neutral-500">
        · Resultados para propietarios:
        {{ SURVEY_RESULTS_VISIBILITY_LABELS[survey.resultsVisibility].toLowerCase() }}
      </span>
    </div>

    <p
      v-if="survey.description"
      class="mb-6 max-w-3xl text-sm whitespace-pre-line text-neutral-700 dark:text-neutral-300"
    >
      {{ survey.description }}
    </p>

    <!-- Draft: preview -->
    <template v-if="survey.status === 'draft'">
      <UiAlert color="warning" variant="soft" class="mb-4">
        Es un borrador: los propietarios aún no la ven. Revisa las preguntas y publícala; después ya
        no se puede modificar.
      </UiAlert>
      <ol class="space-y-3">
        <li
          v-for="(q, index) in survey.questions"
          :key="q.id"
          class="rounded-2xl bg-white p-5 ring-1 ring-brand-900/5 dark:bg-neutral-900 dark:ring-white/10"
        >
          <p class="font-medium">{{ index + 1 }}. {{ q.text }}</p>
          <p v-if="q.description" class="text-sm text-neutral-500">{{ q.description }}</p>
          <ul class="mt-3 space-y-1.5 text-sm">
            <li v-for="o in q.options" :key="o.id" class="flex items-center gap-2">
              <i class="mdi mdi-radiobox-blank text-neutral-400" aria-hidden="true" />{{ o.label }}
            </li>
          </ul>
        </li>
      </ol>
    </template>

    <template v-else-if="survey.results">
      <UiTabs v-model="tab" :tabs="tabs" class="mb-4" aria-label="Secciones" />
      <SurveyResults
        v-show="tab === 'results'"
        :questions="survey.questions"
        :results="survey.results"
      />

      <div v-show="tab === 'voters'" class="space-y-3">
        <UiAlert v-if="survey.anonymous" color="neutral" variant="soft" icon="mdi-incognito">
          Encuesta anónima: ves qué unidades respondieron, no qué eligió cada una.
        </UiAlert>
        <p v-if="!voters?.length" class="py-8 text-center text-sm text-neutral-500">
          Ninguna unidad ha respondido todavía
        </p>
        <div
          v-else
          class="overflow-x-auto rounded-2xl bg-white ring-1 ring-brand-900/5 dark:bg-neutral-900 dark:ring-white/10"
        >
          <table class="w-full text-sm">
            <thead class="text-left text-xs text-neutral-500">
              <tr class="border-b border-neutral-100 dark:border-white/10">
                <th class="px-4 py-3 font-medium">Unidad</th>
                <th class="px-4 py-3 font-medium">Coeficiente</th>
                <th class="px-4 py-3 font-medium">Respondió</th>
                <template v-if="!survey.anonymous">
                  <th
                    v-for="(q, i) in survey.questions"
                    :key="q.id"
                    class="px-4 py-3 font-medium"
                    :title="q.text"
                  >
                    P{{ i + 1 }}
                  </th>
                </template>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100 dark:divide-white/5">
              <tr v-for="voter in voters" :key="voter.unit.id">
                <td class="px-4 py-2.5 font-medium whitespace-nowrap">{{ unitLabel(voter) }}</td>
                <td class="px-4 py-2.5 tabular-nums">
                  {{ formatPercent(voter.coefficient * 100) }}
                </td>
                <td class="px-4 py-2.5">
                  <span class="block">{{ voter.votedBy ?? '—' }}</span>
                  <span class="text-xs text-neutral-500">{{ formatDateTime(voter.votedAt) }}</span>
                </td>
                <template v-if="voter.answers">
                  <td v-for="q in survey.questions" :key="q.id" class="px-4 py-2.5">
                    {{ optionLabel(q.id, voter.answers[q.id] ?? '') }}
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <p class="mt-8 text-xs text-neutral-500">
      Creada por {{ survey.createdBy ?? '—' }} el {{ formatDateTime(survey.createdAt) }}
      <template v-if="survey.opensAt">
        · publicada el {{ formatDateTime(survey.opensAt) }}</template
      >
    </p>
  </template>

  <SurveyFormModal v-model="editing" :survey="survey" @saved="(s) => (survey = s)" />

  <UiModal v-model="publishing" title="Publicar encuesta" size="sm" :persistent="busy">
    <div class="space-y-4 text-sm">
      <p>
        Los propietarios podrán responder hasta el
        <strong>{{ survey ? formatDateTime(survey.closesAt) : '' }}</strong
        >. Después de publicarla no podrás cambiar las preguntas.
      </p>
      <UiSwitch v-model="notify" label="Avisar a los propietarios" />
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UiButton variant="ghost" :disabled="busy" @click="publishing = false">Cancelar</UiButton>
        <UiButton color="primary" :loading="busy" @click="publish">Publicar</UiButton>
      </div>
    </template>
  </UiModal>

  <ConfirmDialog
    v-model="removing"
    title="Eliminar borrador"
    message="Se elimina la encuesta con sus preguntas. No se puede deshacer."
    :loading="busy"
    @confirm="remove"
  />
</template>
