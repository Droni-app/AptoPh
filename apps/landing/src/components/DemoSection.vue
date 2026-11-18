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
  <section id="demo" class="py-20 sm:py-28" aria-labelledby="demo-title">
    <div class="container-page">
      <div class="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div>
          <p
            class="inline-flex items-center gap-2 rounded-full bg-mint-100 px-3.5 py-1.5 text-sm font-semibold text-mint-700"
          >
            <span class="relative flex size-2">
              <span
                class="absolute inline-flex size-full animate-ping rounded-full bg-mint-400 opacity-60 motion-reduce:hidden"
              />
              <span class="relative inline-flex size-2 rounded-full bg-mint-500" />
            </span>
            Demo en vivo
          </p>
          <h2 id="demo-title" class="heading-section mt-5">
            Conoce AptoPH por dentro, sin registrarte
          </h2>
          <p class="lead mt-5">
            Preparamos el conjunto
            <strong class="font-semibold text-brand-700">{{ demo.conjunto }}</strong> con torres,
            unidades, residentes, cuotas, pagos, reservas, PQRS, visitas y paquetes. Elige un
            perfil, copia los datos de acceso e ingresa.
          </p>
          <ul class="mt-8 space-y-3 text-slate">
            <li class="flex items-center gap-3">
              <KeyRound class="size-5 shrink-0 text-mint-600" aria-hidden="true" />
              Al ingresar, escribe el correo y la contraseña del perfil.
            </li>
            <li class="flex items-center gap-3">
              <RotateCcw class="size-5 shrink-0 text-mint-600" aria-hidden="true" />
              Los datos son ficticios y se restablecen periódicamente.
            </li>
          </ul>
        </div>

        <ul class="grid gap-5 md:grid-cols-2">
          <li
            v-for="account in demo.accounts"
            :key="account.id"
            class="flex flex-col rounded-[1.75rem] bg-white p-6 ring-1 ring-brand-900/8 sm:p-7"
          >
            <span
              class="grid size-12 place-items-center rounded-2xl"
              :class="account.app === 'admin' ? 'bg-brand-700 text-white' : 'bg-mint-400 text-ink'"
            >
              <component :is="icons[account.app]" class="size-5.5" aria-hidden="true" />
            </span>
            <h3 class="mt-5 text-xl font-extrabold">{{ account.title }}</h3>
            <p class="mt-2 text-[0.95rem] leading-relaxed text-slate">{{ account.description }}</p>

            <dl class="mt-6 space-y-2.5">
              <div
                v-for="field in [
                  { id: `${account.id}-email`, label: 'Correo', value: account.email },
                  { id: `${account.id}-password`, label: 'Contraseña', value: demo.password },
                ]"
                :key="field.id"
                class="flex items-center justify-between gap-3 rounded-2xl bg-cream py-2.5 pr-2.5 pl-4"
              >
                <div class="min-w-0">
                  <dt class="text-xs font-medium text-slate">{{ field.label }}</dt>
                  <dd class="truncate font-semibold text-brand-700 select-all">
                    {{ field.value }}
                  </dd>
                </div>
                <button
                  type="button"
                  class="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600 ring-1 ring-brand-100 transition hover:text-brand-800 hover:ring-brand-300 focus-visible:outline-2 focus-visible:outline-brand-700"
                  :aria-label="`Copiar ${field.label.toLowerCase()}: ${field.value}`"
                  @click="copy(field.id, field.value)"
                >
                  <Check
                    v-if="copied === field.id"
                    class="size-4 text-mint-700"
                    aria-hidden="true"
                  />
                  <Copy v-else class="size-4" aria-hidden="true" />
                </button>
              </div>
            </dl>
            <p class="sr-only" aria-live="polite">{{ copied ? 'Copiado al portapapeles' : '' }}</p>

            <!-- Spacer: lines up both buttons at the bottom of their cards -->
            <div class="flex-1" aria-hidden="true" />
            <a
              :href="links[account.app]"
              target="_blank"
              rel="noopener"
              class="mt-6 text-center whitespace-normal"
              :class="account.app === 'admin' ? 'btn-primary' : 'btn-mint'"
            >
              {{ account.cta }}
              <ArrowUpRight class="size-4" aria-hidden="true" />
            </a>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
