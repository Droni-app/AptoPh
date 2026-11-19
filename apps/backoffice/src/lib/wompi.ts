import type { BillingCharge, BillingConfig, PaymentTokenStatus } from '@aptoph/shared'
import { billingApi } from '@/api/backoffice'

/**
 * Wompi in the browser (docs/billing.md). The card goes straight from the
 * browser to Wompi with the public key: its number and code never reach
 * AptoPH's servers. Only the resulting token does.
 */

export interface CardInput {
  number: string
  cvc: string
  expMonth: string
  expYear: string
  holder: string
}

export interface CardToken {
  id: string
  brand: string
  lastFour: string
  expMonth: number
  expYear: number
}

export class WompiCardError extends Error {
  constructor(
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message)
  }
}

const FIELD_NAMES: Record<string, keyof CardInput> = {
  number: 'number',
  cvc: 'cvc',
  exp_month: 'expMonth',
  exp_year: 'expYear',
  card_holder: 'holder',
}

/** Luhn check: catches typos before asking Wompi */
export function validCardNumber(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

/** Tokenizes a card in Wompi (POST /tokens/cards with the public key) */
export async function tokenizeCard(config: BillingConfig, card: CardInput): Promise<CardToken> {
  let response: Response
  try {
    response = await fetch(`${config.apiUrl}/tokens/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.publicKey}`,
      },
      body: JSON.stringify({
        number: card.number.replace(/\D/g, ''),
        cvc: card.cvc.trim(),
        exp_month: card.expMonth.padStart(2, '0'),
        exp_year: card.expYear.slice(-2),
        card_holder: card.holder.trim(),
      }),
    })
  } catch {
    throw new WompiCardError('No pudimos comunicarnos con Wompi. Revisa tu conexión.')
  }
  const body = await response.json().catch(() => null)
  if (!response.ok || body?.status !== 'CREATED') {
    const messages = (body?.error?.messages ?? {}) as Record<string, string[] | string>
    const fields: Record<string, string> = {}
    for (const [key, value] of Object.entries(messages)) {
      const field = FIELD_NAMES[key]
      if (field) fields[field] = Array.isArray(value) ? value[0]! : String(value)
    }
    throw new WompiCardError(
      Object.keys(fields).length
        ? 'Revisa los datos de la tarjeta.'
        : (body?.error?.reason ?? 'Wompi no aceptó la tarjeta. Revisa los datos.'),
      fields,
    )
  }
  const data = body.data
  return {
    id: data.id,
    brand: data.brand,
    lastFour: data.last_four,
    expMonth: Number(data.exp_month),
    expYear: Number(data.exp_year),
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Waits for Wompi to decide a charge (it starts "in process"). Returns the
 * latest state when the time runs out: the API keeps checking it.
 */
export async function waitForCharge(
  id: string,
  options: { timeoutMs?: number; signal?: { cancelled: boolean } } = {},
): Promise<BillingCharge> {
  const until = Date.now() + (options.timeoutMs ?? 60_000)
  let charge = (await billingApi.charge(id)).data
  while (charge.status === 'pending' && Date.now() < until && !options.signal?.cancelled) {
    await sleep(2500)
    charge = (await billingApi.charge(id)).data
  }
  return charge
}

/** Waits while the person approves a Nequi, DaviPlata or Bancolombia token */
export async function waitForToken(
  type: 'nequi' | 'daviplata' | 'bancolombia_transfer',
  id: string,
  options: { timeoutMs?: number; signal?: { cancelled: boolean } } = {},
): Promise<PaymentTokenStatus> {
  const until = Date.now() + (options.timeoutMs ?? 180_000)
  let token = (await billingApi.tokenStatus(type, id)).data
  while (token.status === 'PENDING' && Date.now() < until && !options.signal?.cancelled) {
    await sleep(3000)
    token = (await billingApi.tokenStatus(type, id)).data
  }
  return token
}

/** Bancolombia sends the person to the bank and back: what to resume on return */
const BANCOLOMBIA_KEY = 'aptoph.bancolombia-token'

export interface PendingBancolombia {
  tokenId: string
  acceptanceToken: string
  personalAuthToken: string
}

export function rememberBancolombia(value: PendingBancolombia) {
  try {
    sessionStorage.setItem(BANCOLOMBIA_KEY, JSON.stringify(value))
  } catch {
    // Without storage the person adds the method again after returning
  }
}

export function takeBancolombia(): PendingBancolombia | null {
  try {
    const raw = sessionStorage.getItem(BANCOLOMBIA_KEY)
    sessionStorage.removeItem(BANCOLOMBIA_KEY)
    return raw ? (JSON.parse(raw) as PendingBancolombia) : null
  } catch {
    return null
  }
}
