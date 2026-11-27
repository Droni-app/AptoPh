<script setup lang="ts">
import { UiButton } from '@aptoph/ui'
import EmptyState from '@/components/EmptyState.vue'
</script>

<template>
  <main class="grid min-h-full place-items-center px-4 py-12 text-center">
    <div>
      <h1 class="sr-only">Página no encontrada</h1>
      <EmptyState
        title="No encontramos esta página"
        description="Puede que el enlace esté mal escrito o que la página ya no exista."
      >
        <UiButton color="primary" to="/">Ir al inicio</UiButton>
      </EmptyState>
    </div>
  </main>
</template>
