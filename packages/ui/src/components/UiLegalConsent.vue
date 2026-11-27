<script setup lang="ts">
import { useId } from 'vue'
import { LEGAL_DOCUMENTS, legalUrl, type LegalDocumentId } from '@aptoph/shared'

export interface UiLegalConsentProps {
  modelValue?: boolean
  /** Landing that publishes the documents, e.g. https://aptoph.com */
  siteUrl: string
  /**
   * `signup`: terms, data policy and, for the new conjunto, the data processing
   * agreement. `invitation`: terms and data policy.
   */
  kind: 'signup' | 'invitation'
  error?: string
}

const props = defineProps<UiLegalConsentProps>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const id = `consent-${useId()}`
const href = (doc: LegalDocumentId) => legalUrl(props.siteUrl, doc)
const link =
  'font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800 dark:text-brand-200 dark:hover:text-white'
</script>

<template>
  <div>
    <label :for="id" class="flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed">
      <span class="relative mt-[3px] grid size-4 shrink-0 place-items-center">
        <input
          :id="id"
          type="checkbox"
          class="peer size-4 cursor-pointer appearance-none rounded border border-neutral-300 bg-white transition-colors checked:border-brand-700 checked:bg-brand-700 hover:border-neutral-400 aria-invalid:border-red-500 dark:border-white/20 dark:bg-neutral-900 dark:checked:border-brand-300 dark:checked:bg-brand-300"
          :checked="modelValue"
          :aria-invalid="!!error || undefined"
          :aria-describedby="error ? `${id}-error` : undefined"
          @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
        />
        <i
          class="mdi mdi-check pointer-events-none absolute text-[13px] leading-none text-white opacity-0 peer-checked:opacity-100 dark:text-neutral-950"
          aria-hidden="true"
        />
      </span>
      <span class="text-neutral-700 dark:text-neutral-300">
        Acepto los
        <a :href="href('terms')" target="_blank" rel="noopener" :class="link">{{
          LEGAL_DOCUMENTS.terms.title.toLowerCase()
        }}</a>
        y autorizo el tratamiento de mis datos personales según la
        <a :href="href('privacy')" target="_blank" rel="noopener" :class="link"
          >política de tratamiento de datos</a
        ><template v-if="kind === 'signup'"
          >. En nombre del conjunto, acepto el
          <a :href="href('data_processing')" target="_blank" rel="noopener" :class="link"
            >acuerdo de encargo del tratamiento de datos</a
          ></template
        >.
      </span>
    </label>
    <p
      v-if="error"
      :id="`${id}-error`"
      class="mt-1.5 ml-6.5 flex items-start gap-1 text-xs text-red-700 dark:text-red-300"
      role="alert"
    >
      <i class="mdi mdi-alert-circle-outline mt-px" aria-hidden="true" />
      {{ error }}
    </p>
  </div>
</template>
