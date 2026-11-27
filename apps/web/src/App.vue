<script setup lang="ts">
import { RouterView } from 'vue-router'
import { UiToast } from '@aptoph/ui'
</script>

<template>
  <RouterView />
  <UiToast position="top-right" />
</template>
