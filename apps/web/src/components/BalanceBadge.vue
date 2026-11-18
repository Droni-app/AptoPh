<script setup lang="ts">
import { computed } from 'vue'
import { DuiBadge } from '@dronico/droni-kit'
import type { UnitBalance } from '@aptoph/shared'
import { isZero } from '@/lib/format'

const props = defineProps<{ balance: UnitBalance }>()

const state = computed(() => {
  if (!isZero(props.balance.overdue)) return { label: 'En mora', color: 'danger' as const }
  if (!isZero(props.balance.pending)) return { label: 'Pago pendiente', color: 'warning' as const }
  return { label: 'Al día', color: 'success' as const }
})
</script>

<template>
  <DuiBadge :label="state.label" :color="state.color" variant="soft" size="sm" />
</template>
