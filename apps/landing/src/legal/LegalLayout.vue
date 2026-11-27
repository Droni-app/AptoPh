<script setup lang="ts">
import { computed } from 'vue'
import {
  COMPANY,
  LEGAL_DOCUMENTS,
  LEGAL_DOCUMENT_ORDER,
  legalVersionLabel,
  type LegalDocumentId,
} from '@aptoph/shared'
import BrandLogo from '@/components/BrandLogo.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import { links } from '@/links'

export interface LegalSectionLink {
  id: string
  title: string
}

const props = defineProps<{
  /** The document shown; none for the index of documents */
  document?: LegalDocumentId
  sections?: LegalSectionLink[]
}>()

const current = computed(() => (props.document ? LEGAL_DOCUMENTS[props.document] : null))
const documents = LEGAL_DOCUMENT_ORDER.map((id) => LEGAL_DOCUMENTS[id])
</script>

<template>
  <a
    href="#contenido"
    class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow"
    >Saltar al contenido</a
  >
  <header class="border-b border-brand-100 bg-cream/95 backdrop-blur-md print:hidden">
    <div class="container-page flex h-16 items-center justify-between gap-4">
      <a href="/" class="h-8 shrink-0" aria-label="AptoPH, ir al inicio">
        <BrandLogo class="h-8" />
      </a>
      <div class="flex items-center gap-2">
        <a
          :href="links.login"
          class="hidden rounded-full px-4 py-2 text-[0.95rem] font-semibold text-brand-700 hover:bg-brand-50 sm:inline-flex"
          >Ingresar</a
        >
        <a :href="links.signup" class="btn-primary px-5 py-2 text-sm">Prueba gratis</a>
      </div>
    </div>
  </header>

  <main id="contenido" class="container-page py-10 lg:py-14">
    <nav aria-label="Ruta" class="mb-8 text-sm text-slate print:hidden">
      <a href="/" class="hover:text-brand-700 hover:underline">Inicio</a>
      <span class="mx-2 text-brand-200" aria-hidden="true">/</span>
      <a v-if="current" href="/legal/" class="hover:text-brand-700 hover:underline">Legal</a>
      <span v-else aria-current="page" class="font-medium text-brand-700">Legal</span>
      <template v-if="current">
        <span class="mx-2 text-brand-200" aria-hidden="true">/</span>
        <span aria-current="page" class="font-medium text-brand-700">{{ current.title }}</span>
      </template>
    </nav>

    <div class="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
      <aside class="order-2 lg:order-1 print:hidden">
        <div class="lg:sticky lg:top-8">
          <h2 class="text-sm font-bold">Documentos legales</h2>
          <ul class="mt-3 space-y-1 border-l border-brand-100">
            <li v-for="doc in documents" :key="doc.id">
              <a
                :href="`/legal/${doc.slug}/`"
                class="-ml-px block border-l-2 py-1.5 pl-4 text-[0.93rem] leading-snug transition-colors"
                :class="
                  doc.id === document
                    ? 'border-mint-500 font-semibold text-brand-700'
                    : 'border-transparent text-slate hover:border-brand-200 hover:text-brand-700'
                "
                :aria-current="doc.id === document ? 'page' : undefined"
                >{{ doc.title }}</a
              >
            </li>
          </ul>

          <template v-if="sections?.length">
            <h2 class="mt-8 text-sm font-bold">En este documento</h2>
            <ol class="mt-3 space-y-1.5 text-[0.88rem] leading-snug text-slate">
              <li v-for="(section, index) in sections" :key="section.id" class="flex gap-2">
                <span class="w-5 shrink-0 text-right tabular-nums text-brand-300"
                  >{{ index + 1 }}.</span
                >
                <a :href="`#${section.id}`" class="hover:text-brand-700 hover:underline">{{
                  section.title
                }}</a>
              </li>
            </ol>
          </template>

          <div class="mt-8 rounded-2xl bg-white p-4 text-[0.88rem] leading-relaxed text-slate ring-1 ring-brand-100">
            <p class="font-semibold text-brand-700">{{ COMPANY.legalName }}</p>
            <p>NIT {{ COMPANY.nit }}</p>
            <p>{{ COMPANY.address }}</p>
            <p>
              <a :href="`mailto:${COMPANY.email}`" class="text-brand-700 underline">{{
                COMPANY.email
              }}</a>
            </p>
            <p>{{ COMPANY.phone }}</p>
          </div>
        </div>
      </aside>

      <article class="order-1 min-w-0 lg:order-2">
        <header v-if="current" class="mb-10 max-w-[44rem] border-b border-brand-100 pb-8">
          <h1 class="text-[2rem] leading-tight font-extrabold tracking-[-0.02em] sm:text-[2.5rem]">
            {{ current.title }}
          </h1>
          <p class="mt-3 text-slate">
            Versión vigente desde el {{ legalVersionLabel(current.id) }}.
            <button
              type="button"
              class="ml-1 font-medium text-brand-700 underline underline-offset-2 print:hidden"
              onclick="window.print()"
            >
              Imprimir o guardar en PDF
            </button>
          </p>
        </header>
        <div class="legal-prose">
          <slot />
        </div>
      </article>
    </div>
  </main>
  <SiteFooter class="print:hidden" />
</template>
