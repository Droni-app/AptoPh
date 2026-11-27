<script setup lang="ts">
import { legalUrl } from '@aptoph/shared'
import BrandLogo from '@/components/BrandLogo.vue'
import comunidad800 from '@/assets/img/hero-comunidad-800.webp'
import comunidad1200 from '@/assets/img/hero-comunidad-1200.webp'

const siteUrl = import.meta.env.VITE_SITE_URL

/** Split screen for login and account pages: the form on the left, the illustration on the right */
const illustrationSrcset = `${comunidad800} 800w, ${comunidad1200} 1200w`
</script>

<template>
  <main class="grid min-h-full lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
    <div class="flex flex-col px-6 py-8 sm:px-10">
      <RouterLink to="/login" class="h-9 self-start" aria-label="AptoPH, iniciar sesión">
        <BrandLogo class="h-9" />
      </RouterLink>

      <div class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <slot />
      </div>

      <nav aria-label="Legal" class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
        <a :href="legalUrl(siteUrl, 'terms')" target="_blank" rel="noopener" class="hover:underline"
          >Términos y condiciones</a
        >
        <a :href="legalUrl(siteUrl, 'privacy')" target="_blank" rel="noopener" class="hover:underline"
          >Tratamiento de datos</a
        >
      </nav>
    </div>

    <div class="relative hidden overflow-hidden bg-[#f8f1e7] lg:block dark:bg-neutral-900">
      <img
        :src="comunidad1200"
        :srcset="illustrationSrcset"
        sizes="55vw"
        alt=""
        class="absolute inset-0 size-full object-cover object-[75%_center] dark:opacity-90"
      />
      <div
        class="absolute inset-x-10 bottom-10 max-w-md rounded-3xl bg-white/85 p-6 shadow-[0_8px_24px_-8px_rgb(30_58_95/0.25)] backdrop-blur dark:bg-neutral-900/85"
      >
        <p class="font-display text-lg font-bold text-brand-700 dark:text-white">
          Tu conjunto, más cerca.
        </p>
        <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Consulta tu estado de cuenta, reserva zonas comunes y autoriza visitas desde el celular.
        </p>
      </div>
    </div>
  </main>
</template>
