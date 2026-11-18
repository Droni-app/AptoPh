import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { SubscriptionSummary } from '@aptoph/shared'
import { subscriptionApi } from '@/api/backoffice'
import { ApiError } from '@/lib/http'

/** Show the trial reminder in the layout from this many days left */
const REMINDER_FROM_DAYS = 7

/**
 * Plan of the active conjunto. `null` for managed conjuntos without a subscription.
 */
export const useSubscriptionStore = defineStore('subscription', () => {
  const current = ref<SubscriptionSummary | null>(null)
  const loadedFor = ref<string | null>(null)

  const locked = computed(() => current.value?.locked ?? false)
  const trialDaysLeft = computed(() => current.value?.trialDaysLeft ?? null)
  const showTrialReminder = computed(
    () =>
      current.value?.status === 'trialing' &&
      !locked.value &&
      (trialDaysLeft.value ?? 0) <= REMINDER_FROM_DAYS,
  )

  async function load(tenantId: string, force = false) {
    if (!force && loadedFor.value === tenantId) return
    try {
      current.value = (await subscriptionApi.show()).data
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error
      current.value = null
    }
    loadedFor.value = tenantId
  }

  function set(value: SubscriptionSummary) {
    current.value = value
  }

  return { current, locked, trialDaysLeft, showTrialReminder, load, set }
})
