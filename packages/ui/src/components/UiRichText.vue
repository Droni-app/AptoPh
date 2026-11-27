<script setup lang="ts">
/**
 * Shows rich text that the API already sanitized (comunicados). Never pass it
 * HTML from anywhere else: it is rendered as is.
 */
defineProps<{ html: string }>()
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- sanitized by the API (rich_text.ts) -->
  <div class="ui-prose" v-html="html" />
</template>
