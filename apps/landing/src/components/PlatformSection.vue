<script setup lang="ts">
import { Building2, Repeat } from '@lucide/vue'
import { art } from '@/art'
import { channels } from '@/content'
</script>

<template>
  <section class="bg-brand-50 py-20 sm:py-28" aria-labelledby="platform-title">
    <div class="container-page grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
      <div class="overflow-hidden rounded-[2rem] bg-cream">
        <img
          :src="art.appMovil.src"
          :srcset="art.appMovil.srcset"
          sizes="(min-width: 1024px) 40rem, 100vw"
          :width="art.appMovil.width"
          :height="art.appMovil.height"
          alt="Residentes usan la app de AptoPH para pagar, reservar la piscina y recibir un paquete del portero"
          class="aspect-[4/3] w-full object-cover object-[80%_center]"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div>
        <h2 id="platform-title" class="heading-section">
          En el computador de la administración y en el celular de cada residente
        </h2>
        <p class="lead mt-5">
          Todos los canales trabajan sobre la misma información. Lo que registra portería lo ve el
          residente, y lo que reporta el residente le llega a la administración.
        </p>

        <ul class="mt-9 divide-y divide-brand-900/8 border-y border-brand-900/8">
          <li v-for="channel in channels" :key="channel.title" class="flex gap-4 py-5">
            <span
              class="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-brand-600 shadow-[0_6px_16px_-10px_rgb(30_58_95/0.6)]"
            >
              <component :is="channel.icon" class="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 class="font-display text-lg font-bold">{{ channel.title }}</h3>
              <p class="mt-1 text-slate">{{ channel.description }}</p>
            </div>
          </li>
        </ul>

        <div class="mt-8 rounded-[1.5rem] bg-brand-700 p-6 text-white sm:p-7">
          <h3 class="flex items-center gap-2.5 text-lg font-bold text-white">
            <Repeat class="size-5 text-mint-300" aria-hidden="true" />
            ¿Administras varios conjuntos?
          </h3>
          <p class="mt-2 text-brand-100">
            Con una sola cuenta cambias de copropiedad sin cerrar sesión. Cada conjunto mantiene su
            información aislada, su equipo y sus residentes.
          </p>
          <div class="mt-5 flex flex-wrap gap-2" aria-hidden="true">
            <span
              v-for="name in ['Reservas del Bosque', 'Torres de la Sabana', 'Edificio Mirador']"
              :key="name"
              class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-brand-50"
            >
              <Building2 class="size-3.5 text-mint-300" />
              {{ name }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
