<script setup lang="ts">
import { COMPANY, LEGAL_DOCUMENTS, LEGAL_DOCUMENT_ORDER, legalVersionLabel } from '@aptoph/shared'
import LegalLayout from './LegalLayout.vue'

const documents = LEGAL_DOCUMENT_ORDER.map((id) => LEGAL_DOCUMENTS[id])
</script>

<template>
  <LegalLayout>
    <h1 class="text-[2rem] leading-tight font-extrabold tracking-[-0.02em] sm:text-[2.5rem]">
      Documentos legales
    </h1>
    <p class="lead">
      {{ COMPANY.product }} es un servicio de {{ COMPANY.legalName }} Estos documentos explican las
      reglas del servicio y cómo cuidamos la información de los conjuntos y de las personas que lo
      usan.
    </p>
    <ul class="mt-8 grid list-none gap-4 p-0 sm:grid-cols-2">
      <li v-for="doc in documents" :key="doc.id" class="m-0">
        <a
          :href="`/legal/${doc.slug}/`"
          class="flex h-full flex-col rounded-2xl bg-white p-5 no-underline ring-1 ring-brand-100 transition hover:ring-brand-300"
        >
          <span class="font-display text-lg leading-snug font-bold text-brand-700">{{
            doc.title
          }}</span>
          <span class="mt-2 flex-1 text-[0.95rem] leading-relaxed text-slate">{{
            doc.summary
          }}</span>
          <span class="mt-4 text-sm text-slate">Vigente desde el {{ legalVersionLabel(doc.id) }}</span>
        </a>
      </li>
    </ul>
  </LegalLayout>
</template>
