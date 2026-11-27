import type { DateTime } from 'luxon'

/** ISO date of a model value, or null */
export const iso = (value: DateTime | null | undefined) => value?.toISO() ?? null
