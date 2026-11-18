<script setup lang="ts">
import { iconArt } from '@/art'
import { security } from '@/content'
</script>

<template>
  <section id="seguridad" class="bg-white py-20 sm:py-28" aria-labelledby="security-title">
    <div class="container-page grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
      <div>
        <img
          :src="iconArt('seguridad')"
          alt=""
          width="128"
          height="128"
          class="size-20"
          loading="lazy"
        />
        <h2 id="security-title" class="heading-section mt-6">
          La información del conjunto, protegida
        </h2>
        <p class="lead mt-5">
          AptoPH guarda datos personales de propietarios, arrendatarios, visitantes y personal. Por
          eso la seguridad hace parte del diseño de la plataforma desde el inicio.
        </p>
      </div>

      <dl class="grid gap-x-10 gap-y-9 sm:grid-cols-2">
        <div v-for="item in security" :key="item.title" class="border-t-2 border-mint-400 pt-5">
          <dt class="flex items-center gap-2.5 font-display text-lg font-bold text-brand-700">
            <component :is="item.icon" class="size-5 text-brand-500" aria-hidden="true" />
            {{ item.title }}
          </dt>
          <dd class="mt-2 text-slate">{{ item.description }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
