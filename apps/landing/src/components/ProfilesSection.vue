<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { Check } from '@lucide/vue'
import { art } from '@/art'
import { profileArt, profiles } from '@/content'

const active = ref(0)
const tabs = ref<HTMLButtonElement[]>([])

/** Arrow keys move between tabs (WAI-ARIA tabs pattern, automatic activation) */
async function onKey(event: KeyboardEvent, index: number) {
  const last = profiles.length - 1
  const next =
    event.key === 'ArrowRight' || event.key === 'ArrowDown'
      ? index === last
        ? 0
        : index + 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? index === 0
          ? last
          : index - 1
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? last
            : null
  if (next === null) return
  event.preventDefault()
  active.value = next
  await nextTick()
  tabs.value[next]?.focus()
}

const slug = (role: string) =>
  role
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '-')
</script>

<template>
  <section id="perfiles" class="py-20 sm:py-28" aria-labelledby="profiles-title">
    <div class="container-page">
      <div class="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div class="max-w-2xl">
          <h2 id="profiles-title" class="heading-section">
            Cada persona del conjunto, con las herramientas de su rol
          </h2>
          <p class="lead mt-5">
            Una misma persona puede tener varios perfiles. Por ejemplo, un propietario que además es
            miembro del consejo entra con una sola cuenta.
          </p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Perfiles"
        class="-mx-4 mt-12 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      >
        <button
          v-for="(profile, index) in profiles"
          :id="`tab-${slug(profile.role)}`"
          :key="profile.role"
          ref="tabs"
          type="button"
          role="tab"
          :aria-selected="active === index"
          :aria-controls="`panel-${slug(profile.role)}`"
          :tabindex="active === index ? 0 : -1"
          class="flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-[0.95rem] font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          :class="
            active === index
              ? 'bg-brand-700 text-white'
              : 'bg-white text-brand-700 ring-1 ring-brand-100 hover:ring-brand-300'
          "
          @click="active = index"
          @keydown="onKey($event, index)"
        >
          <component :is="profile.icon" class="size-4.5" aria-hidden="true" />
          {{ profile.role }}
        </button>
      </div>

      <!-- Every panel is in the HTML (crawlable); only the active one is shown -->
      <div
        v-for="(profile, index) in profiles"
        v-show="active === index"
        :id="`panel-${slug(profile.role)}`"
        :key="profile.role"
        role="tabpanel"
        :aria-labelledby="`tab-${slug(profile.role)}`"
        tabindex="0"
        class="mt-6 grid overflow-hidden rounded-[2rem] bg-white ring-1 ring-brand-900/5 focus-visible:outline-2 focus-visible:outline-brand-700 lg:grid-cols-[1fr_1.15fr]"
      >
        <div class="order-2 p-7 sm:p-10 lg:order-1 lg:p-12">
          <h3 class="text-[1.75rem] leading-tight font-extrabold">{{ profile.role }}</h3>
          <p class="lead mt-3">{{ profile.pitch }}</p>
          <ul class="mt-7 space-y-3.5">
            <li v-for="item in profile.can" :key="item" class="flex gap-3 text-ink">
              <span
                class="mt-0.5 grid size-5.5 shrink-0 place-items-center rounded-full bg-mint-100 text-mint-700"
              >
                <Check class="size-3.5" stroke-width="3" aria-hidden="true" />
              </span>
              {{ item }}
            </li>
          </ul>
        </div>
        <div class="order-1 bg-cream lg:order-2">
          <img
            :src="art[profileArt[profile.role]!].src"
            :srcset="art[profileArt[profile.role]!].srcset"
            sizes="(min-width: 1024px) 40rem, 100vw"
            :width="art[profileArt[profile.role]!].width"
            :height="art[profileArt[profile.role]!].height"
            alt=""
            class="aspect-[16/10] size-full object-cover object-right lg:aspect-auto"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </div>
  </section>
</template>
