<script setup lang="ts">
import BrandLogo from './BrandLogo.vue'
import { features, nav, site } from '@/content'
import { links } from '@/links'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="bg-brand-900 text-brand-100">
    <div class="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <BrandLogo variant="white" class="h-10" />
        <p class="mt-5 max-w-sm leading-relaxed">
          {{ site.tagline }} Software para la administración de conjuntos residenciales, edificios y
          copropiedades en Colombia.
        </p>
        <a :href="links.signup" class="btn-mint mt-7">Prueba gratis</a>
      </div>

      <nav aria-label="Funcionalidades">
        <h2 class="font-display text-base font-bold text-white">Funcionalidades</h2>
        <ul class="mt-4 space-y-2.5 text-[0.95rem]">
          <li v-for="feature in features" :key="feature.id">
            <a :href="`#${feature.id}`" class="hover:text-white">{{ feature.title }}</a>
          </li>
        </ul>
      </nav>

      <nav aria-label="AptoPH">
        <h2 class="font-display text-base font-bold text-white">AptoPH</h2>
        <ul class="mt-4 space-y-2.5 text-[0.95rem]">
          <li v-for="link in nav" :key="link.href">
            <a :href="link.href" class="hover:text-white">{{ link.label }}</a>
          </li>
          <li><a :href="links.login" class="hover:text-white">Ingresar</a></li>
          <li><a :href="`mailto:${links.email}`" class="hover:text-white">Contacto</a></li>
        </ul>
      </nav>
    </div>
    <div class="border-t border-white/10">
      <p class="container-page py-6 text-sm text-brand-200">
        © {{ year }} AptoPH. Todos los derechos reservados.
      </p>
    </div>
  </footer>
</template>
