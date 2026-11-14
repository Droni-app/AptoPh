<script setup lang="ts">
import { computed } from 'vue'
import logoColor from '../../../../docs/brand/logo/aptoph-logo-horizontal.svg?raw'
import logoWhite from '../../../../docs/brand/logo/aptoph-logo-horizontal-white.svg?raw'

const props = withDefaults(defineProps<{ variant?: 'color' | 'white' }>(), { variant: 'color' })

// Inlined so the logo is in the prerendered HTML without an extra request
const svg = computed(() => (props.variant === 'white' ? logoWhite : logoColor))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- trusted SVG from docs/brand -->
  <span class="logo-svg inline-block" v-html="svg" />
</template>
