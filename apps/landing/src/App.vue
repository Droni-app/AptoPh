<script setup lang="ts">
import SiteHeader from './components/SiteHeader.vue'
import HeroSection from './components/HeroSection.vue'
import FeaturesSection from './components/FeaturesSection.vue'
import ProfilesSection from './components/ProfilesSection.vue'
import PlatformSection from './components/PlatformSection.vue'
import StepsSection from './components/StepsSection.vue'
import SecuritySection from './components/SecuritySection.vue'
import FaqSection from './components/FaqSection.vue'
import CtaSection from './components/CtaSection.vue'
import SiteFooter from './components/SiteFooter.vue'
</script>

<template>
  <a
    href="#contenido"
    class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
    >Saltar al contenido</a
  >
  <SiteHeader />
  <main id="contenido">
    <HeroSection />
    <FeaturesSection />
    <ProfilesSection />
    <PlatformSection />
    <StepsSection />
    <SecuritySection />
    <FaqSection />
    <CtaSection />
  </main>
  <SiteFooter />
</template>
