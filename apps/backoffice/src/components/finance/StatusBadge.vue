<script setup lang="ts">
import { computed } from 'vue'
import { DuiBadge } from '@dronico/droni-kit'
import {
  BILL_STATUS_LABELS,
  BILLING_PERIOD_STATUS_LABELS,
  BUDGET_STATUS_LABELS,
  CHARGE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  VENDOR_PAYMENT_STATUS_LABELS,
} from '@aptoph/shared'

const props = defineProps<{
  kind: 'charge' | 'payment' | 'bill' | 'vendorPayment' | 'period' | 'budget'
  status: string
  /** Pending charge past its due date */
  overdue?: boolean
}>()

const LABELS: Record<string, Record<string, string>> = {
  charge: CHARGE_STATUS_LABELS,
  payment: PAYMENT_STATUS_LABELS,
  bill: BILL_STATUS_LABELS,
  vendorPayment: VENDOR_PAYMENT_STATUS_LABELS,
  period: BILLING_PERIOD_STATUS_LABELS,
  budget: BUDGET_STATUS_LABELS,
}

const COLORS: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'primary'> = {
  paid: 'success',
  confirmed: 'success',
  approved: 'success',
  open: 'primary',
  pending: 'warning',
  partially_paid: 'warning',
  pending_review: 'warning',
  draft: 'neutral',
  closed: 'neutral',
  cancelled: 'neutral',
  reversed: 'neutral',
  rejected: 'danger',
}

const label = computed(() =>
  props.overdue ? 'Vencido' : (LABELS[props.kind]?.[props.status] ?? props.status),
)
const color = computed(() => (props.overdue ? 'danger' : (COLORS[props.status] ?? 'neutral')))
</script>

<template>
  <DuiBadge :label="label" :color="color" variant="soft" size="sm" />
</template>
