<script setup lang="ts">
import { RouterView } from 'vue-router'
import { DuiToast } from '@dronico/droni-kit'
</script>

<template>
  <RouterView />
  <DuiToast position="top-right" />
</template>
