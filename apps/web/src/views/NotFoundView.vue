<script setup lang="ts">
import { DuiButton } from '@dronico/droni-kit'
</script>

<template>
  <main class="grid min-h-full place-items-center px-4 py-12 text-center">
    <div>
      <p class="text-5xl font-semibold text-mint-700 dark:text-mint-300">404</p>
      <h1 class="mt-2 text-xl font-semibold">Página no encontrada</h1>
      <DuiButton class="mt-6" color="primary" to="/">Ir al inicio</DuiButton>
    </div>
  </main>
</template>
