<script setup lang="ts">
import sinResultados from '@/assets/img/empty-sin-resultados.webp'
import sinMensajes from '@/assets/img/empty-sin-mensajes.webp'
import bienvenida from '@/assets/img/empty-bienvenida.webp'
import alDia from '@/assets/img/empty-pagos-al-dia.webp'

const images = {
  'sin-resultados': sinResultados,
  'sin-mensajes': sinMensajes,
  bienvenida,
  'al-dia': alDia,
}

withDefaults(defineProps<{ title: string; description?: string; art?: keyof typeof images }>(), {
  art: 'sin-resultados',
  description: undefined,
})
</script>

<template>
  <div class="flex flex-col items-center px-4 py-8 text-center">
    <img :src="images[art]" alt="" width="640" height="574" class="w-44 sm:w-52" loading="lazy" />
    <p class="mt-3 font-display text-base font-bold text-brand-700 dark:text-brand-100">
      {{ title }}
    </p>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>
