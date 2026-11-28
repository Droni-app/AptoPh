<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiButton,
  UiInput,
  UiLabel,
  UiModal,
  UiSwitch,
  UiTextarea,
  useToast,
} from '@aptoph/ui'
import {
  SURVEY_MAX_OPTIONS,
  SURVEY_MAX_QUESTIONS,
  SURVEY_RESULTS_VISIBILITY,
  SURVEY_RESULTS_VISIBILITY_DESCRIPTIONS,
  SURVEY_RESULTS_VISIBILITY_LABELS,
  type SurveyDetail,
  type SurveyInput,
  type SurveyResultsVisibility,
} from '@aptoph/shared'
import { surveysApi } from '@/api/surveys'
import { todayInput } from '@/lib/format'
import { bogotaInput, fromBogotaInput } from '@/lib/surveys'
import { errorMessage, fieldErrors } from '@/lib/errors'

const props = defineProps<{ survey: SurveyDetail | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [survey: SurveyDetail] }>()
const toast = useToast()

type QuestionForm = { key: number; text: string; description: string; options: string[] }

let keys = 0
const question = (text = '', options = ['Sí', 'No', 'Me abstengo']): QuestionForm => ({
  key: ++keys,
  text,
  description: '',
  options: [...options],
})

const form = ref({
  title: '',
  description: '',
  closesAt: '',
  anonymous: true,
  resultsVisibility: 'after_vote' as SurveyResultsVisibility,
  withMinimum: true,
  minParticipation: 51 as number | string,
  questions: [question()],
})
const publishNow = ref(false)
const notify = ref(true)
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)

watch(open, (value) => {
  if (!value) return
  errors.value = {}
  error.value = null
  publishNow.value = false
  notify.value = true
  const s = props.survey
  form.value = s
    ? {
        title: s.title,
        description: s.description ?? '',
        closesAt: bogotaInput(s.closesAt),
        anonymous: s.anonymous,
        resultsVisibility: s.resultsVisibility,
        withMinimum: s.minParticipation !== null,
        minParticipation: s.minParticipation ?? 51,
        questions: s.questions.map((q) => ({
          key: ++keys,
          text: q.text,
          description: q.description ?? '',
          options: q.options.map((o) => o.label),
        })),
      }
    : {
        title: '',
        description: '',
        closesAt: `${todayInput(8)}T18:00`,
        anonymous: true,
        resultsVisibility: 'after_vote',
        withMinimum: true,
        minParticipation: 51,
        questions: [question()],
      }
})

function addQuestion() {
  form.value.questions.push(question())
}
function removeQuestion(index: number) {
  form.value.questions.splice(index, 1)
}
function moveQuestion(index: number, delta: number) {
  const list = form.value.questions
  const [item] = list.splice(index, 1)
  list.splice(index + delta, 0, item!)
}
function addOption(q: QuestionForm) {
  q.options.push('')
}
function removeOption(q: QuestionForm, index: number) {
  q.options.splice(index, 1)
}

/** Errors of a question, its options included */
const questionError = (index: number) =>
  Object.entries(errors.value)
    .filter(([key]) => key === `questions.${index}` || key.startsWith(`questions.${index}.`))
    .map(([, message]) => message)
    .join(' ')

function payload(): SurveyInput {
  const f = form.value
  return {
    title: f.title,
    description: f.description || null,
    closesAt: fromBogotaInput(f.closesAt),
    anonymous: f.anonymous,
    resultsVisibility: f.resultsVisibility,
    minParticipation: f.withMinimum ? Number(f.minParticipation) : null,
    questions: f.questions.map((q) => ({
      text: q.text,
      description: q.description || null,
      options: q.options.map((o) => o.trim()).filter(Boolean),
    })),
  }
}

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  try {
    const body = payload()
    let { data } = props.survey
      ? await surveysApi.update(props.survey.id, body)
      : await surveysApi.create(body)
    if (publishNow.value) {
      const published = await surveysApi.publish(data.id, notify.value)
      data = published.data
      toast.success(
        published.notified
          ? `Encuesta publicada. Se avisó a ${published.notified} propietarios`
          : 'Encuesta publicada',
      )
    } else {
      toast.success('Borrador guardado: revísalo y publícalo cuando esté listo')
    }
    emit('saved', data)
    open.value = false
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? 'Revisa los campos marcados' : errorMessage(e)
  } finally {
    saving.value = false
  }
}

const visibilityOptions = SURVEY_RESULTS_VISIBILITY
const canPublish = computed(() => !props.survey?.opensAt)
</script>

<template>
  <UiModal
    v-model="open"
    :title="survey ? 'Editar encuesta' : 'Nueva encuesta'"
    size="lg"
    scrollable
    :persistent="saving"
  >
    <form class="space-y-6" @submit.prevent="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>

      <section class="space-y-4">
        <UiLabel title="Nombre de la encuesta" required :error="errors.title">
          <UiInput
            v-model="form.title"
            required
            minlength="3"
            maxlength="200"
            placeholder="Remodelación del salón social"
            block
          />
        </UiLabel>
        <UiLabel
          title="Contexto"
          help-text="Explica el tema: lo verán los propietarios antes de responder"
          :error="errors.description"
        >
          <UiTextarea v-model="form.description" rows="3" maxlength="3000" block />
        </UiLabel>
        <div class="grid gap-4 sm:grid-cols-2">
          <UiLabel
            title="Fecha límite"
            required
            help-text="Hora de Colombia. Abre al publicarla."
            :error="errors.closesAt"
          >
            <UiInput v-model="form.closesAt" type="datetime-local" required block />
          </UiLabel>
          <UiLabel
            title="Participación mínima esperada"
            help-text="Sobre el coeficiente de copropiedad"
            :error="errors.minParticipation"
          >
            <div class="flex items-center gap-3">
              <UiSwitch v-model="form.withMinimum" :label="form.withMinimum ? '' : 'Sin mínimo'" />
              <div v-if="form.withMinimum" class="flex items-center gap-1">
                <UiInput
                  v-model="form.minParticipation"
                  type="number"
                  min="1"
                  max="100"
                  step="0.5"
                  class="w-24"
                  aria-label="Porcentaje mínimo"
                />
                <span class="text-sm text-neutral-500">%</span>
              </div>
            </div>
          </UiLabel>
        </div>
      </section>

      <section class="space-y-3 rounded-xl bg-neutral-50 p-4 dark:bg-white/5">
        <UiSwitch
          v-model="form.anonymous"
          label="Encuesta anónima"
          :description="
            form.anonymous
              ? 'Nadie, ni la administración, ve qué respondió cada unidad: solo los totales y quién participó.'
              : 'La administración, el consejo y el revisor ven qué respondió cada unidad.'
          "
        />
        <fieldset>
          <legend class="mb-2 text-sm font-medium">Los propietarios ven los resultados</legend>
          <div class="grid gap-2 sm:grid-cols-2" role="radiogroup">
            <button
              v-for="value in visibilityOptions"
              :key="value"
              type="button"
              role="radio"
              :aria-checked="form.resultsVisibility === value"
              class="rounded-xl p-3 text-left ring-1 transition"
              :class="
                form.resultsVisibility === value
                  ? 'bg-white ring-2 ring-mint-500 dark:bg-mint-400/10'
                  : 'ring-neutral-200 hover:ring-mint-400 dark:ring-white/10'
              "
              @click="form.resultsVisibility = value"
            >
              <span class="block text-sm font-medium">{{
                SURVEY_RESULTS_VISIBILITY_LABELS[value]
              }}</span>
              <span class="block text-xs text-neutral-500 dark:text-neutral-400">{{
                SURVEY_RESULTS_VISIBILITY_DESCRIPTIONS[value]
              }}</span>
            </button>
          </div>
        </fieldset>
      </section>

      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold">Preguntas</h3>
          <span class="text-xs text-neutral-500">Opción única · una respuesta por unidad</span>
        </div>
        <UiAlert v-if="errors.questions" color="danger" variant="soft">{{
          errors.questions
        }}</UiAlert>

        <div
          v-for="(q, index) in form.questions"
          :key="q.key"
          class="space-y-3 rounded-xl p-4 ring-1 ring-neutral-200 dark:ring-white/10"
          :class="questionError(index) ? 'ring-coral-400' : ''"
        >
          <div class="flex items-start gap-2">
            <span
              class="mt-2 grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-400/15 dark:text-brand-200"
              >{{ index + 1 }}</span
            >
            <UiInput
              v-model="q.text"
              required
              minlength="3"
              maxlength="500"
              placeholder="¿Está de acuerdo con…?"
              :aria-label="`Pregunta ${index + 1}`"
              class="flex-1"
              block
            />
            <div class="flex shrink-0">
              <UiButton
                size="sm"
                variant="ghost"
                icon="mdi-arrow-up"
                :disabled="index === 0"
                title="Subir"
                @click="moveQuestion(index, -1)"
              />
              <UiButton
                size="sm"
                variant="ghost"
                icon="mdi-arrow-down"
                :disabled="index === form.questions.length - 1"
                title="Bajar"
                @click="moveQuestion(index, 1)"
              />
              <UiButton
                size="sm"
                variant="ghost"
                color="danger"
                icon="mdi-delete-outline"
                :disabled="form.questions.length === 1"
                title="Quitar pregunta"
                @click="removeQuestion(index)"
              />
            </div>
          </div>
          <UiInput
            v-model="q.description"
            maxlength="1000"
            placeholder="Aclaración opcional (valor, alcance, propuesta…)"
            :aria-label="`Aclaración de la pregunta ${index + 1}`"
            size="sm"
            block
          />
          <ul class="space-y-2 pl-8">
            <li v-for="(_, o) in q.options" :key="o" class="flex items-center gap-2">
              <i class="mdi mdi-radiobox-blank text-neutral-400" aria-hidden="true" />
              <UiInput
                v-model="q.options[o]"
                maxlength="200"
                :placeholder="`Opción ${o + 1}`"
                :aria-label="`Opción ${o + 1} de la pregunta ${index + 1}`"
                size="sm"
                class="flex-1"
                block
              />
              <UiButton
                size="sm"
                variant="ghost"
                icon="mdi-close"
                :disabled="q.options.length <= 2"
                title="Quitar opción"
                @click="removeOption(q, o)"
              />
            </li>
          </ul>
          <div class="flex items-center justify-between pl-8">
            <UiButton
              size="sm"
              variant="ghost"
              icon="mdi-plus"
              :disabled="q.options.length >= SURVEY_MAX_OPTIONS"
              @click="addOption(q)"
              >Opción</UiButton
            >
            <p v-if="questionError(index)" class="text-xs text-coral-700 dark:text-coral-300">
              {{ questionError(index) }}
            </p>
          </div>
        </div>

        <UiButton
          variant="outline"
          icon="mdi-plus"
          block
          :disabled="form.questions.length >= SURVEY_MAX_QUESTIONS"
          @click="addQuestion"
          >Agregar pregunta</UiButton
        >
      </section>

      <section v-if="canPublish" class="space-y-3 rounded-xl bg-neutral-50 p-4 dark:bg-white/5">
        <UiSwitch
          v-model="publishNow"
          label="Publicar al guardar"
          description="Si lo dejas apagado queda como borrador: nadie más la ve y la puedes seguir editando. Una vez publicada ya no se modifica."
        />
        <UiSwitch
          v-if="publishNow"
          v-model="notify"
          label="Avisar a los propietarios"
          description="Notificación en la app, correo y push según las preferencias de cada uno."
        />
      </section>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
        <UiButton color="primary" :loading="saving" @click="submit">
          {{ publishNow ? 'Guardar y publicar' : 'Guardar borrador' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
