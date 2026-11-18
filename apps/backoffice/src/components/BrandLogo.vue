<script setup lang="ts">
import logoColor from '../../../../branding/logo/aptoph-logo-horizontal.svg?url'
import logoWhite from '../../../../branding/logo/aptoph-logo-horizontal-white.svg?url'
import symbolColor from '../../../../branding/logo/aptoph-symbol.svg?url'

/** `full`: symbol + wordmark (white wordmark in dark mode). `symbol`: just the buildings. */
withDefaults(defineProps<{ kind?: 'full' | 'symbol' }>(), { kind: 'full' })
</script>

<template>
  <img v-if="kind === 'symbol'" :src="symbolColor" alt="AptoPH" class="h-full w-auto" />
  <span v-else class="inline-flex h-full">
    <img :src="logoColor" alt="AptoPH" class="h-full w-auto dark:hidden" />
    <img :src="logoWhite" alt="AptoPH" class="hidden h-full w-auto dark:block" />
  </span>
</template>
