import vine from '@vinejs/vine'

/** Rules shared by the validators of several modules */

export const optionalText = (max: number) =>
  vine.string().trim().maxLength(max).nullable().optional()

/**
 * Date and time with an explicit offset ("2026-11-20T19:00:00-05:00" or "…Z"), so the
 * instant is unambiguous whatever the browser's timezone. Parse with DateTime.fromISO.
 */
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/
export const dateTime = () => vine.string().trim().regex(ISO_DATE_TIME)

/** Colombian plates: ABC123 (cars), ABC12D (motorcycles); bicycles may have none */
export const plate = () =>
  vine
    .string()
    .trim()
    .toUpperCase()
    // Rules run before transform(): allow "ABC 123" / "ABC-123" and store "ABC123"
    .regex(/^[A-Z0-9](?:[ -]?[A-Z0-9]){2,9}$/)
    .transform((value) => value.replace(/[\s-]/g, ''))
