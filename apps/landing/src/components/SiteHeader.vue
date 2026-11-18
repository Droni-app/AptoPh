<script setup lang="ts">
import { ref } from 'vue'
import { Menu, X } from '@lucide/vue'
import BrandLogo from './BrandLogo.vue'
import { nav } from '@/content'
import { links } from '@/links'

const open = ref(false)
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-navy-100/80 bg-white/90 backdrop-blur">
    <div class="container-page flex h-16 items-center justify-between gap-6">
      <a href="#inicio" class="h-8 shrink-0" aria-label="AptoPH, ir al inicio">
        <BrandLogo class="h-8" />
      </a>

      <nav aria-label="Principal" class="hidden lg:block">
        <ul class="flex items-center gap-7 text-sm font-medium text-navy-700">
          <li v-for="link in nav" :key="link.href">
            <a :href="link.href" class="transition-colors hover:text-navy-900">{{ link.label }}</a>
          </li>
        </ul>
      </nav>

      <div class="hidden items-center gap-3 lg:flex">
        <a :href="links.login" class="btn-ghost py-2.5">Ingresar</a>
        <a :href="links.signup" class="btn-primary py-2.5">Prueba gratis</a>
      </div>

      <button
        type="button"
        class="rounded-lg p-2 text-navy-900 hover:bg-navy-50 lg:hidden"
        :aria-expanded="open"
        aria-controls="menu-movil"
        @click="open = !open"
      >
        <span class="sr-only">{{ open ? 'Cerrar menú' : 'Abrir menú' }}</span>
        <X v-if="open" class="size-6" aria-hidden="true" />
        <Menu v-else class="size-6" aria-hidden="true" />
      </button>
    </div>

    <nav
      v-show="open"
      id="menu-movil"
      aria-label="Principal (móvil)"
      class="border-t border-navy-100 bg-white lg:hidden"
    >
      <ul class="container-page flex flex-col py-3">
        <li v-for="link in nav" :key="link.href">
          <a
            :href="link.href"
            class="block rounded-lg px-2 py-3 font-medium text-navy-800 hover:bg-navy-50"
            @click="open = false"
            >{{ link.label }}</a
          >
        </li>
        <li class="mt-2 grid grid-cols-2 gap-3 pb-2">
          <a :href="links.login" class="btn-ghost">Ingresar</a>
          <a :href="links.signup" class="btn-primary">Prueba gratis</a>
        </li>
      </ul>
    </nav>
  </header>
</template>
