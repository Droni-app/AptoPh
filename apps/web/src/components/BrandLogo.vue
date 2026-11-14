<script setup lang="ts">
import logoColor from '../../../../docs/brand/logo/aptoph-logo-horizontal.svg?raw'
import logoWhite from '../../../../docs/brand/logo/aptoph-logo-horizontal-white.svg?raw'
</script>

<template>
  <!-- Color logo on light theme, white logo on dark theme -->
  <span class="logo-svg inline-flex" role="img" aria-label="AptoPH">
    <!-- eslint-disable-next-line vue/no-v-html -- trusted SVG from docs/brand -->
    <span class="contents dark:hidden" aria-hidden="true" v-html="logoColor" />
    <!-- eslint-disable-next-line vue/no-v-html -- trusted SVG from docs/brand -->
    <span class="hidden dark:contents" aria-hidden="true" v-html="logoWhite" />
  </span>
</template>

<style scoped>
.logo-svg :deep(svg) {
  height: 100%;
  width: auto;
}
</style>
