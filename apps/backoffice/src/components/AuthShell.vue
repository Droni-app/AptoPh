<script setup lang="ts">
import BrandLogo from '@/components/BrandLogo.vue'
import administracion800 from '@/assets/img/administracion-800.webp'
import administracion1400 from '@/assets/img/administracion-1400.webp'

/** Split screen for login and sign-up: the form on the left, the brand illustration on the right */
withDefaults(defineProps<{ wide?: boolean }>(), { wide: false })

const illustrationSrcset = `${administracion800} 800w, ${administracion1400} 1400w`
</script>

<template>
  <main class="grid min-h-full lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
    <div class="flex flex-col px-6 py-8 sm:px-10">
      <RouterLink to="/login" class="h-9 self-start" aria-label="AptoPH, iniciar sesión">
        <BrandLogo />
      </RouterLink>

      <div
        class="mx-auto flex w-full flex-1 flex-col justify-center py-10"
        :class="wide ? 'max-w-xl' : 'max-w-sm'"
      >
        <slot />
      </div>

      <p class="text-xs text-neutral-500 dark:text-neutral-400">
        AptoPH · Administración de copropiedades
      </p>
    </div>

    <div class="relative hidden overflow-hidden bg-[#f3ede4] lg:block dark:bg-neutral-900">
      <img
        :src="administracion1400"
        :srcset="illustrationSrcset"
        sizes="55vw"
        alt=""
        class="absolute inset-0 size-full object-cover object-[70%_center] dark:opacity-90"
      />
      <div
        class="absolute inset-x-10 bottom-10 max-w-md rounded-3xl bg-white/85 p-6 shadow-[0_8px_24px_-8px_rgb(30_58_95/0.25)] backdrop-blur dark:bg-neutral-900/85"
      >
        <p class="font-display text-lg font-bold text-brand-700 dark:text-white">
          La administración de tu conjunto, simple y cercana.
        </p>
        <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Censo, cuotas, pagos, reservas, PQRS y portería en un solo lugar.
        </p>
      </div>
    </div>
  </main>
</template>
