<script setup lang="ts">
import { security } from '@/content'
</script>

<template>
  <section id="seguridad" class="bg-navy-50/50 py-20 sm:py-28" aria-labelledby="security-title">
    <div class="container-page grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p class="eyebrow">Seguridad y privacidad</p>
        <h2 id="security-title" class="mt-3 text-3xl font-semibold sm:text-4xl">
          La información del conjunto, protegida
        </h2>
        <p class="mt-4 text-lg text-navy-600">
          AptoPH guarda datos personales de propietarios, arrendatarios, visitantes y personal. Por
          eso la seguridad hace parte del diseño de la plataforma desde el inicio.
        </p>
      </div>

      <div class="grid gap-5 sm:grid-cols-2">
        <article
          v-for="item in security"
          :key="item.title"
          class="rounded-2xl bg-white p-6 ring-1 ring-navy-100"
        >
          <component :is="item.icon" class="size-6 text-teal-600" aria-hidden="true" />
          <h3 class="mt-4 font-semibold">{{ item.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-navy-600">{{ item.description }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
