<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { TRIAL_DAYS } from '@aptoph/shared'
import { links } from '@/links'

/**
 * On phones the sign-up button stays within reach once the hero is out of view,
 * and steps aside near the final call to action and the footer.
 */
const visible = ref(false)
let observer: IntersectionObserver | undefined

onMounted(() => {
  const hero = document.getElementById('inicio')
  const ends = [
    document.getElementById('cta-title')?.closest('section'),
    document.querySelector('footer'),
  ]
  if (!hero || !('IntersectionObserver' in window)) return
  /** Which of the watched elements are on screen right now */
  const onScreen = new Set<Element>([hero])
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) onScreen.add(entry.target)
      else onScreen.delete(entry.target)
    }
    visible.value = onScreen.size === 0
  })
  observer.observe(hero)
  for (const el of ends) if (el) observer.observe(el)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div
    class="fixed inset-x-3 bottom-3 z-30 flex items-center justify-between gap-3 rounded-full bg-brand-700 py-2 pr-2 pl-5 shadow-[0_18px_40px_-12px_rgb(16_32_56/0.6)] transition duration-300 sm:hidden"
    :class="visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'"
    :aria-hidden="!visible"
  >
    <p class="text-sm leading-tight font-semibold text-white">
      {{ TRIAL_DAYS }} días gratis, sin tarjeta
    </p>
    <a :href="links.signup" class="btn-mint px-5 py-2.5 text-sm" :tabindex="visible ? 0 : -1"
      >Empezar</a
    >
  </div>
</template>
