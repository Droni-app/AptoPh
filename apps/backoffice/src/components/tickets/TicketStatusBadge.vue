<script setup lang="ts">
import { UiBadge, type UiColor } from '@aptoph/ui'
import { TICKET_STATUS_LABELS, type TicketStatus } from '@aptoph/shared'

defineProps<{ status: TicketStatus }>()

const colors: Record<TicketStatus, UiColor> = {
  open: 'warning',
  in_progress: 'primary',
  resolved: 'success',
  closed: 'neutral',
}
</script>

<template>
  <UiBadge :label="TICKET_STATUS_LABELS[status]" :color="colors[status]" variant="soft" size="sm" />
</template>
