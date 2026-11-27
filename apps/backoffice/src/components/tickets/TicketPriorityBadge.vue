<script setup lang="ts">
import { UiBadge, type UiColor } from '@aptoph/ui'
import { TICKET_PRIORITY_LABELS, type TicketPriority } from '@aptoph/shared'

defineProps<{ priority: TicketPriority }>()

const colors: Record<TicketPriority, UiColor> = {
  low: 'neutral',
  medium: 'secondary',
  high: 'warning',
  urgent: 'danger',
}
</script>

<template>
  <UiBadge
    :label="TICKET_PRIORITY_LABELS[priority]"
    :color="colors[priority]"
    :variant="priority === 'urgent' ? 'solid' : 'soft'"
    size="sm"
  />
</template>
