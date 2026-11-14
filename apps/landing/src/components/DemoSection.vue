<script setup lang="ts">
import { ref } from 'vue'
import { ArrowUpRight, Building2, Check, Copy, House, KeyRound, RotateCcw } from '@lucide/vue'
import { demo } from '@/content'
import { links } from '@/links'

const icons = { admin: Building2, web: House }

/** Field that was just copied ("admin-email", "password"…), to show the check mark */
const copied = ref<string | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

async function copy(id: string, text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    return // Clipboard blocked: the value is still visible to select by hand
  }
  copied.value = id
  clearTimeout(timer)
  timer = setTimeout(() => (copied.value = null), 2000)
}
</script>

<template>
  <section id="demo" class="bg-navy-50/60 py-20 sm:py-28" aria-labelledby="demo-title">
    <div class="container-page">
      <div class="mx-auto max-w-2xl text-center">
        <p class="eyebrow">Demo en vivo</p>
        <h2 id="demo-title" class="mt-3 text-3xl font-semibold sm:text-4xl">
          Conoce AptoPH por dentro, sin registrarte
        </h2>
        <p class="mt-4 text-lg leading-relaxed text-navy-600">
          Preparamos el conjunto <strong class="font-semibold text-navy-900">{{ demo.conjunto }}</strong>
          con torres, unidades, residentes, cuotas, pagos, reservas, PQRS, visitas y paquetes. Elige
          un perfil, copia los datos de acceso e ingresa.
        </p>
      </div>

      <ul class="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        <li
          v-for="account in demo.accounts"
          :key="account.id"
          class="flex flex-col rounded-3xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8"
        >
          <div class="flex items-center gap-3">
            <span class="grid size-11 place-items-center rounded-2xl bg-navy-900 text-teal-400">
              <component :is="icons[account.app]" class="size-5" aria-hidden="true" />
            </span>
            <h3 class="text-xl font-semibold">{{ account.title }}</h3>
          </div>
          <p class="mt-3 leading-relaxed text-navy-600">{{ account.description }}</p>

          <dl class="mt-6 space-y-3">
            <div
              v-for="field in [
                { id: `${account.id}-email`, label: 'Correo', value: account.email },
                { id: `${account.id}-password`, label: 'Contraseña', value: demo.password },
              ]"
              :key="field.id"
              class="flex items-center justify-between gap-3 rounded-xl bg-navy-50 px-4 py-3"
            >
              <div class="min-w-0">
                <dt class="text-xs font-medium tracking-wide text-navy-500 uppercase">
                  {{ field.label }}
                </dt>
                <dd class="truncate font-mono text-sm font-medium text-navy-900 select-all">
                  {{ field.value }}
                </dd>
              </div>
              <button
                type="button"
                class="grid size-9 shrink-0 place-items-center rounded-lg text-navy-600 ring-1 ring-navy-200 transition hover:bg-white hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-teal-600"
                :aria-label="`Copiar ${field.label.toLowerCase()}: ${field.value}`"
                @click="copy(field.id, field.value)"
              >
                <Check v-if="copied === field.id" class="size-4 text-teal-700" aria-hidden="true" />
                <Copy v-else class="size-4" aria-hidden="true" />
              </button>
            </div>
          </dl>
          <p class="sr-only" aria-live="polite">{{ copied ? 'Copiado al portapapeles' : '' }}</p>

          <a
            :href="links[account.app]"
            target="_blank"
            rel="noopener"
            class="btn-primary mt-6 py-3"
          >
            {{ account.cta }}
            <ArrowUpRight class="size-4" aria-hidden="true" />
          </a>
        </li>
      </ul>

      <ul class="mx-auto mt-8 flex max-w-4xl flex-col gap-3 text-sm text-navy-600 sm:flex-row sm:justify-center sm:gap-8">
        <li class="flex items-center gap-2">
          <KeyRound class="size-4 shrink-0 text-teal-700" aria-hidden="true" />
          Al ingresar, escribe el correo y la contraseña del perfil.
        </li>
        <li class="flex items-center gap-2">
          <RotateCcw class="size-4 shrink-0 text-teal-700" aria-hidden="true" />
          Los datos son ficticios y se restablecen periódicamente.
        </li>
      </ul>
    </div>
  </section>
</template>
