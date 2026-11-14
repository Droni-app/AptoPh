<script setup lang="ts">
import BrandLogo from './BrandLogo.vue'
import { features, nav, site } from '@/content'
import { links } from '@/links'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="bg-navy-950 text-navy-200">
    <div class="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <BrandLogo variant="white" class="h-9" />
        <p class="mt-5 max-w-sm text-sm leading-relaxed">
          {{ site.tagline }} Software para la administración de conjuntos residenciales, edificios y
          copropiedades en Colombia.
        </p>
      </div>

      <nav aria-label="Funcionalidades">
        <h2 class="font-display text-sm font-semibold text-white">Funcionalidades</h2>
        <ul class="mt-4 space-y-2.5 text-sm">
          <li v-for="feature in features" :key="feature.id">
            <a :href="`#${feature.id}`" class="hover:text-white">{{ feature.title }}</a>
          </li>
        </ul>
      </nav>

      <nav aria-label="AptoPH">
        <h2 class="font-display text-sm font-semibold text-white">AptoPH</h2>
        <ul class="mt-4 space-y-2.5 text-sm">
          <li v-for="link in nav" :key="link.href">
            <a :href="link.href" class="hover:text-white">{{ link.label }}</a>
          </li>
          <li><a :href="links.login" class="hover:text-white">Ingresar</a></li>
          <li><a :href="`mailto:${links.email}`" class="hover:text-white">Contacto</a></li>
        </ul>
      </nav>
    </div>
    <div class="border-t border-white/10">
      <p class="container-page py-6 text-xs text-navy-300">
        © {{ year }} AptoPH. Todos los derechos reservados.
      </p>
    </div>
  </footer>
</template>
