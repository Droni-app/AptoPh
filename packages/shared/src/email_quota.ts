/**
 * Bulk email quota of a conjunto (docs/email-quota.md).
 * Bulk emails (comunicados, and later other mass mailings) count; transactional
 * ones (invitations, password reset, email verification, receipts) never do.
 */

/** Emails included every calendar month */
export const EMAIL_MONTHLY_INCLUDED = 3000
/** Size and price (COP, before VAT) of an additional pack, valid for the month it is added */
export const EMAIL_PACK_SIZE = 3000
export const EMAIL_PACK_PRICE = 10000
/** Packs that can be asked for in a single request */
export const EMAIL_PACKS_MAX_PER_REQUEST = 20

export interface EmailQuota {
  /** Calendar month, `yyyy-mm` in the conjunto's time zone */
  period: string
  included: number
  extraPacks: number
  /** included + extraPacks × EMAIL_PACK_SIZE */
  limit: number
  used: number
  available: number
  /** Packs asked for and not yet activated */
  requestedPacks: number
  requestedAt: string | null
}

/** Recipients and quota of the month an announcement would email */
export interface EmailPreview {
  recipients: number
  quota: EmailQuota
}

export const emailPacksPrice = (packs: number) => packs * EMAIL_PACK_PRICE

/** Packs needed to send `count` more emails with `available` left */
export const emailPacksNeeded = (count: number, available: number) =>
  Math.max(0, Math.ceil((count - available) / EMAIL_PACK_SIZE))
