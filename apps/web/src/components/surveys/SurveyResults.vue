<script setup lang="ts">
import { computed, ref } from 'vue'
import { UiTabs } from '@aptoph/ui'
import type { SurveyQuestion, SurveyResults } from '@aptoph/shared'
import { coefficientShare, formatPercent, percent } from '@/lib/surveys'

const props = defineProps<{ questions: SurveyQuestion[]; results: SurveyResults }>()

/** Count by units or by coefficient (Ley 675) */
const mode = ref<'coefficient' | 'votes'>('coefficient')
const modes = [
  { label: 'Por coeficiente', value: 'coefficient' },
  { label: 'Por unidades', value: 'votes' },
]

const p = computed(() => props.results.participation)

const rows = computed(() =>
  props.questions.map((question) => {
    const result = props.results.questions.find((r) => r.questionId === question.id)
    const options = question.options.map((option) => {
      const r = result?.options.find((o) => o.optionId === option.id)
      return { ...option, votes: r?.votes ?? 0, coefficient: r?.coefficient ?? 0 }
    })
    const totalVotes = options.reduce((sum, o) => sum + o.votes, 0)
    const totalCoefficient = options.reduce((sum, o) => sum + o.coefficient, 0)
    const shares = options.map((o) =>
      mode.value === 'votes'
        ? percent(o.votes, totalVotes)
        : percent(o.coefficient, totalCoefficient),
    )
    const top = Math.max(...shares)
    return {
      question,
      options: options.map((o, i) => ({
        ...o,
        share: shares[i]!,
        leading: top > 0 && shares[i] === top,
      })),
    }
  }),
)
</script>

<template>
  <div class="space-y-6">
    <div
      class="grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-900/5 sm:grid-cols-3 dark:bg-neutral-900 dark:ring-white/10"
    >
      <div>
        <p class="text-xs font-medium text-neutral-500">Unidades que respondieron</p>
        <p class="text-2xl font-bold tabular-nums">
          {{ p.votedUnits }}
          <span class="text-base font-medium text-neutral-400">de {{ p.eligibleUnits }}</span>
        </p>
        <p class="text-xs text-neutral-500">
          {{ formatPercent(percent(p.votedUnits, p.eligibleUnits)) }} de las unidades
        </p>
      </div>
      <div>
        <p class="text-xs font-medium text-neutral-500">Coeficiente que respondió</p>
        <p class="text-2xl font-bold tabular-nums">{{ formatPercent(coefficientShare(p)) }}</p>
        <div class="relative mt-2 h-2 rounded-full bg-neutral-100 dark:bg-white/10">
          <div
            class="h-2 rounded-full"
            :class="p.reached ? 'bg-mint-500' : 'bg-amber-500'"
            :style="{ width: `${Math.min(100, coefficientShare(p))}%` }"
          />
          <div
            v-if="p.minParticipation"
            class="absolute -top-1 h-4 w-0.5 bg-neutral-700 dark:bg-white"
            :style="{ left: `${p.minParticipation}%` }"
            :title="`Mínimo esperado: ${p.minParticipation} %`"
          />
        </div>
      </div>
      <div class="flex items-center gap-3">
        <i
          class="mdi text-3xl"
          :class="
            p.reached
              ? 'mdi-check-decagram text-mint-600 dark:text-mint-400'
              : 'mdi-progress-alert text-amber-600 dark:text-amber-400'
          "
          aria-hidden="true"
        />
        <p class="text-sm">
          <template v-if="p.minParticipation === null">Sin participación mínima</template>
          <template v-else-if="p.reached"
            >Se alcanzó el mínimo esperado del {{ p.minParticipation }} %</template
          >
          <template v-else
            >Falta para el mínimo del {{ p.minParticipation }} %: los resultados son
            orientativos</template
          >
        </p>
      </div>
    </div>

    <div class="flex items-center justify-between gap-3">
      <h3 class="text-base font-semibold">Resultados</h3>
      <UiTabs v-model="mode" :tabs="modes" variant="pills" size="sm" aria-label="Cómo contar" />
    </div>

    <div
      v-for="(row, index) in rows"
      :key="row.question.id"
      class="rounded-2xl bg-white p-5 ring-1 ring-brand-900/5 dark:bg-neutral-900 dark:ring-white/10"
    >
      <p class="font-medium">{{ index + 1 }}. {{ row.question.text }}</p>
      <p v-if="row.question.description" class="mt-0.5 text-sm text-neutral-500">
        {{ row.question.description }}
      </p>
      <ul class="mt-4 space-y-3">
        <li v-for="option in row.options" :key="option.id">
          <div class="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span :class="option.leading ? 'font-semibold' : ''">
              {{ option.label }}
              <i
                v-if="option.leading"
                class="mdi mdi-crown-outline text-amber-500"
                aria-label="Mayoría"
              />
            </span>
            <span class="text-right whitespace-nowrap tabular-nums">
              <span class="font-semibold">{{ formatPercent(option.share) }}</span>
              <span class="ml-2 text-xs text-neutral-500"
                >{{ option.votes }} {{ option.votes === 1 ? 'unidad' : 'unidades' }} ·
                {{ formatPercent(option.coefficient * 100) }} coef.</span
              >
            </span>
          </div>
          <div class="h-2.5 rounded-full bg-neutral-100 dark:bg-white/10">
            <div
              class="h-2.5 rounded-full transition-all"
              :class="option.leading ? 'bg-mint-500' : 'bg-brand-300 dark:bg-brand-400/60'"
              :style="{ width: `${option.share}%` }"
            />
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
