<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Menu, X } from '@lucide/vue'
import BrandLogo from './BrandLogo.vue'
import { nav } from '@/content'
import { links } from '@/links'

const open = ref(false)
/** The header gets a surface once the page scrolls under it */
const scrolled = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 8
}
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header
    class="sticky top-0 z-40 transition-[background-color,box-shadow] duration-300"
    :class="
      scrolled || open
        ? 'bg-cream/90 shadow-[0_1px_0_rgb(30_58_95/0.08)] backdrop-blur-md'
        : 'bg-transparent'
    "
  >
    <div class="container-page flex h-18 items-center justify-between gap-6">
      <a href="#inicio" class="h-9 shrink-0" aria-label="AptoPH, ir al inicio">
        <BrandLogo class="h-9" />
      </a>

      <nav aria-label="Principal" class="hidden xl:block">
        <ul class="flex items-center gap-0.5 text-[0.92rem] font-medium text-brand-700">
          <li v-for="link in nav" :key="link.href">
            <a
              :href="link.href"
              class="rounded-full px-3 py-2 whitespace-nowrap transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-700"
              >{{ link.label }}</a
            >
          </li>
        </ul>
      </nav>

      <div class="hidden items-center gap-2 xl:flex">
        <a
          :href="links.login"
          class="rounded-full px-4 py-2.5 text-[0.95rem] font-semibold text-brand-700 hover:bg-brand-50"
          >Ingresar</a
        >
        <a :href="links.signup" class="btn-primary py-2.5">Prueba gratis</a>
      </div>

      <div class="flex items-center gap-2 xl:hidden">
        <a :href="links.signup" class="btn-primary hidden px-4 py-2 text-sm sm:inline-flex"
          >Prueba gratis</a
        >
        <button
          type="button"
          class="grid size-11 place-items-center rounded-full text-brand-700 hover:bg-brand-50"
          :aria-expanded="open"
          aria-controls="menu-movil"
          @click="open = !open"
        >
          <span class="sr-only">{{ open ? 'Cerrar menú' : 'Abrir menú' }}</span>
          <X v-if="open" class="size-6" aria-hidden="true" />
          <Menu v-else class="size-6" aria-hidden="true" />
        </button>
      </div>
    </div>

    <nav
      v-show="open"
      id="menu-movil"
      aria-label="Principal (móvil)"
      class="border-t border-brand-100 bg-cream xl:hidden"
    >
      <ul class="container-page flex flex-col py-3">
        <li v-for="link in nav" :key="link.href">
          <a
            :href="link.href"
            class="block rounded-xl px-3 py-3 text-lg font-medium text-brand-700 hover:bg-brand-50"
            @click="open = false"
            >{{ link.label }}</a
          >
        </li>
        <li class="mt-3 grid grid-cols-2 gap-3 pb-3">
          <a :href="links.login" class="btn-ghost">Ingresar</a>
          <a :href="links.signup" class="btn-primary">Prueba gratis</a>
        </li>
      </ul>
    </nav>
  </header>
</template>
