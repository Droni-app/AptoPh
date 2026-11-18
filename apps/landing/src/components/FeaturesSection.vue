<script setup lang="ts">
import { Check } from '@lucide/vue'
import { art, iconArt } from '@/art'
import { chapters, featureArt, features, upcoming } from '@/content'

const byId = new Map(features.map((feature) => [feature.id, feature]))
const chapterFeatures = (ids: string[]) => ids.map((id) => byId.get(id)!)
</script>

<template>
  <section id="funcionalidades" class="bg-white py-20 sm:py-28" aria-labelledby="features-title">
    <div class="container-page">
      <div class="max-w-2xl">
        <h2 id="features-title" class="heading-section">
          Todo lo que necesita la administración de una copropiedad
        </h2>
        <p class="lead mt-5">
          Nueve módulos conectados entre sí. Por ejemplo, una reserva que genera un cobro aparece en
          el estado de cuenta de la unidad, y el pago se aplica a esa deuda.
        </p>
      </div>

      <div class="mt-16 space-y-16 sm:space-y-20">
        <section
          v-for="chapter in chapters"
          :id="`capitulo-${chapter.id}`"
          :key="chapter.id"
          :aria-labelledby="`capitulo-${chapter.id}-title`"
        >
          <!-- Chapter banner: the title sits on the illustration's empty cream half -->
          <div class="relative overflow-hidden rounded-t-[2rem] bg-cream">
            <img
              :src="art[chapter.art].src"
              :srcset="art[chapter.art].srcset"
              sizes="(min-width: 1216px) 76rem, 100vw"
              :width="art[chapter.art].width"
              :height="art[chapter.art].height"
              alt=""
              class="aspect-[2/1] w-full object-cover object-right sm:aspect-[3/1]"
              loading="lazy"
              decoding="async"
            />
            <div
              class="px-6 pt-6 lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:w-[52%] lg:flex-col lg:justify-center lg:p-0 lg:pl-14"
            >
              <h3
                :id="`capitulo-${chapter.id}-title`"
                class="max-w-md text-2xl leading-[1.1] font-extrabold tracking-[-0.02em] lg:text-[2rem] xl:text-[2.4rem]"
              >
                {{ chapter.title }}
              </h3>
              <p class="mt-2 max-w-sm text-slate lg:mt-3 lg:text-lg">{{ chapter.description }}</p>
            </div>
          </div>

          <!-- The chapter's modules share one panel, separated by rules -->
          <div
            class="grid rounded-b-[2rem] bg-cream px-6 pb-4 md:grid-cols-3 md:divide-x md:divide-brand-900/8 md:px-0 md:pt-4 md:pb-8"
          >
            <article
              v-for="feature in chapterFeatures(chapter.featureIds)"
              :id="feature.id"
              :key="feature.id"
              class="border-t border-brand-900/8 py-7 first:border-t-0 md:border-t-0 md:px-8 md:py-6 lg:px-10"
            >
              <img
                :src="iconArt(featureArt[feature.id]!)"
                alt=""
                width="128"
                height="128"
                class="size-14"
                loading="lazy"
              />
              <h4 class="mt-4 font-display text-xl font-bold text-brand-700">
                {{ feature.title }}
              </h4>
              <p class="mt-2 text-slate">{{ feature.summary }}</p>
              <ul class="mt-5 space-y-2.5 text-[0.95rem] text-ink">
                <li v-for="point in feature.points" :key="point" class="flex gap-2.5">
                  <Check
                    class="mt-1 size-4 shrink-0 text-mint-600"
                    stroke-width="2.75"
                    aria-hidden="true"
                  />
                  <span>{{ point }}</span>
                </li>
              </ul>
            </article>
          </div>
        </section>
      </div>

      <div class="mt-16 flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-12">
        <div class="lg:w-64 lg:shrink-0">
          <h3 class="text-2xl font-extrabold">Próximamente</h3>
          <p class="mt-1 text-slate">Lo que estamos construyendo ahora.</p>
        </div>
        <ul class="grid flex-1 gap-4 sm:grid-cols-3">
          <li
            v-for="item in upcoming"
            :key="item.title"
            class="flex gap-4 rounded-[1.5rem] border border-dashed border-brand-200 p-5"
          >
            <img
              :src="iconArt(featureArt[item.title]!)"
              alt=""
              width="128"
              height="128"
              class="size-11 shrink-0 opacity-90"
              loading="lazy"
            />
            <div>
              <p class="font-display font-bold text-brand-700">{{ item.title }}</p>
              <p class="mt-1 text-sm text-slate">{{ item.description }}</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
