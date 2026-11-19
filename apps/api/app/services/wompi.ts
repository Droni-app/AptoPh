import { createHash, timingSafeEqual } from 'node:crypto'
import logger from '@adonisjs/core/services/logger'
import type { PaymentMethodType } from '@aptoph/shared'
import wompiConfig from '#config/wompi'

/**
 * Wompi's REST API (docs/billing.md). Only this module talks to Wompi; the
 * private key never leaves the server. Tests replace it with `wompi.fake()`.
 */

export type WompiTransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR'

export interface WompiTransaction {
  id: string
  reference: string
  status: WompiTransactionStatus
  statusMessage: string | null
  amountInCents: number
  currency: string
  paymentMethodType: string | null
}

export interface WompiPaymentSource {
  id: number
  type: PaymentMethodType
  status: string
  publicData: Record<string, unknown>
}

export interface WompiAcceptance {
  acceptanceToken: string
  policyUrl: string
  personalAuthToken: string
  personalDataUrl: string
}

export interface WompiToken {
  id: string
  status: string
  authorizationUrl?: string | null
  /** DaviPlata: where to send and validate the code */
  otp?: { token: string; sendUrl: string; validateUrl: string }
}

/** Wompi answered with an error: the message is safe to show */
export class WompiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: unknown = null
  ) {
    super(message)
  }
}

export interface WompiApi {
  acceptance(): Promise<WompiAcceptance>
  createPaymentSource(input: {
    type: PaymentMethodType
    token: string
    customerEmail: string
    acceptanceToken: string
    personalAuthToken: string
  }): Promise<WompiPaymentSource>
  voidPaymentSource(id: number): Promise<void>
  createTransaction(input: {
    reference: string
    amountInCents: number
    customerEmail: string
    paymentSourceId: number
    /** Cards only */
    installments?: number
    /** Cards only: periodic charge of the same concept (card on file) */
    recurrent?: boolean
  }): Promise<WompiTransaction>
  getTransaction(id: string): Promise<WompiTransaction | null>
  findTransactionByReference(reference: string): Promise<WompiTransaction | null>
  createNequiToken(phoneNumber: string): Promise<WompiToken>
  createDaviplataToken(input: {
    documentType: string
    documentNumber: string
    phoneNumber: string
  }): Promise<WompiToken>
  daviplataOtp(otp: NonNullable<WompiToken['otp']>, code?: string): Promise<void>
  createBancolombiaToken(redirectUrl: string): Promise<WompiToken>
  getToken(type: 'nequi' | 'daviplata' | 'bancolombia_transfer', id: string): Promise<WompiToken>
}

/** SHA-256 integrity signature of a charge: reference + amount + currency + secret */
export function integritySignature(reference: string, amountInCents: number, currency = 'COP') {
  return createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${wompiConfig.integritySecret}`)
    .digest('hex')
}

/** Link to Wompi's checkout to pay a charge with any method (no saved payment method) */
export function checkoutUrl(input: {
  reference: string
  amountInCents: number
  redirectUrl: string
  customerEmail?: string
}) {
  const url = new URL(wompiConfig.checkoutUrl)
  url.searchParams.set('public-key', wompiConfig.publicKey)
  url.searchParams.set('currency', 'COP')
  url.searchParams.set('amount-in-cents', String(input.amountInCents))
  url.searchParams.set('reference', input.reference)
  url.searchParams.set(
    'signature:integrity',
    integritySignature(input.reference, input.amountInCents)
  )
  url.searchParams.set('redirect-url', input.redirectUrl)
  if (input.customerEmail) url.searchParams.set('customer-data:email', input.customerEmail)
  return url.toString()
}

/** Value at a dotted path of an object ("transaction.amount_in_cents") */
function pick(source: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined,
      source
    )
}

/**
 * Checks the checksum of an event: SHA-256 of the values of `signature.properties`
 * (paths inside `data`), the timestamp and the events secret. Constant time.
 */
export function verifyEventChecksum(event: unknown, headerChecksum?: string | null) {
  if (!event || typeof event !== 'object') return false
  const body = event as {
    data?: unknown
    signature?: { properties?: unknown; checksum?: unknown }
    timestamp?: unknown
  }
  const properties = body.signature?.properties
  const received = String(headerChecksum || body.signature?.checksum || '').toLowerCase()
  if (!Array.isArray(properties) || properties.length === 0 || !received) return false
  if (typeof body.timestamp !== 'number' && typeof body.timestamp !== 'string') return false

  const values = properties.map((property) => {
    const value = pick(body.data, String(property))
    return value === undefined || value === null ? '' : String(value)
  })
  const expected = createHash('sha256')
    .update(`${values.join('')}${body.timestamp}${wompiConfig.eventsSecret}`)
    .digest('hex')
  if (expected.length !== received.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received))
}

function toTransaction(data: any): WompiTransaction {
  return {
    id: String(data.id),
    reference: String(data.reference),
    status: data.status,
    statusMessage: data.status_message ?? null,
    amountInCents: Number(data.amount_in_cents),
    currency: String(data.currency),
    paymentMethodType: data.payment_method_type ?? data.payment_method?.type ?? null,
  }
}

/** First readable message of a Wompi error body */
function errorMessageOf(body: any, status: number) {
  const error = body?.error
  if (error?.messages && typeof error.messages === 'object') {
    const first = Object.values(error.messages).flat()[0]
    if (first) return String(first)
  }
  if (error?.reason) return String(error.reason)
  if (status >= 500) return 'Wompi no está respondiendo. Intenta de nuevo en unos minutos.'
  return 'Wompi rechazó la solicitud'
}

class HttpWompi implements WompiApi {
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    options: {
      key?: 'public' | 'private' | string
      body?: unknown
      headers?: Record<string, string>
    } = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }
    if (options.key) {
      const key =
        options.key === 'public'
          ? wompiConfig.publicKey
          : options.key === 'private'
            ? wompiConfig.privateKey
            : options.key
      headers.Authorization = `Bearer ${key}`
    }
    const url = path.startsWith('https://') ? path : `${wompiConfig.apiUrl}${path}`
    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(20_000),
      })
    } catch (err) {
      logger.error({ err, path }, 'wompi request failed')
      throw new WompiError('No pudimos comunicarnos con Wompi. Intenta de nuevo.', 503)
    }
    const text = await response.text()
    let body: any = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = null
    }
    if (!response.ok) {
      logger.warn({ status: response.status, path, error: body?.error }, 'wompi error')
      throw new WompiError(errorMessageOf(body, response.status), response.status, body?.error)
    }
    return body as T
  }

  async acceptance() {
    const { data } = await this.request<any>('GET', '/merchants/info', {
      headers: { 'x-merchant-public-key': wompiConfig.publicKey },
    })
    return {
      acceptanceToken: data.presigned_acceptance.acceptance_token,
      policyUrl: data.presigned_acceptance.permalink,
      personalAuthToken: data.presigned_personal_data_auth.acceptance_token,
      personalDataUrl: data.presigned_personal_data_auth.permalink,
    }
  }

  async createPaymentSource(input: Parameters<WompiApi['createPaymentSource']>[0]) {
    const { data } = await this.request<any>('POST', '/payment_sources', {
      key: 'private',
      body: {
        type: input.type,
        token: input.token,
        customer_email: input.customerEmail,
        acceptance_token: input.acceptanceToken,
        accept_personal_auth: input.personalAuthToken,
      },
    })
    return {
      id: Number(data.id),
      type: data.type,
      status: data.status,
      publicData: data.public_data ?? {},
    }
  }

  async voidPaymentSource(id: number) {
    await this.request('PUT', `/payment_sources/${id}/void`, { key: 'private' })
  }

  async createTransaction(input: Parameters<WompiApi['createTransaction']>[0]) {
    const body: Record<string, unknown> = {
      amount_in_cents: input.amountInCents,
      currency: 'COP',
      customer_email: input.customerEmail,
      reference: input.reference,
      payment_source_id: input.paymentSourceId,
      signature: integritySignature(input.reference, input.amountInCents),
    }
    if (input.installments) body.payment_method = { installments: input.installments }
    if (input.recurrent !== undefined) body.recurrent = input.recurrent
    const { data } = await this.request<any>('POST', '/transactions', { key: 'private', body })
    return toTransaction(data)
  }

  async getTransaction(id: string) {
    try {
      const { data } = await this.request<any>('GET', `/transactions/${encodeURIComponent(id)}`)
      return toTransaction(data)
    } catch (error) {
      if (error instanceof WompiError && error.status === 404) return null
      throw error
    }
  }

  async findTransactionByReference(reference: string) {
    const { data } = await this.request<any>(
      'GET',
      `/transactions?reference=${encodeURIComponent(reference)}`,
      { key: 'private' }
    )
    const rows = (Array.isArray(data) ? data : []).map(toTransaction)
    // Several attempts can share the reference in the checkout: the approved one wins
    return rows.find((row) => row.status === 'APPROVED') ?? rows[0] ?? null
  }

  async createNequiToken(phoneNumber: string) {
    const { data } = await this.request<any>('POST', '/tokens/nequi', {
      key: 'public',
      body: { phone_number: phoneNumber },
    })
    return { id: data.id, status: data.status }
  }

  async createDaviplataToken(input: Parameters<WompiApi['createDaviplataToken']>[0]) {
    const { data } = await this.request<any>('POST', '/tokens/daviplata', {
      key: 'public',
      body: {
        type_document: input.documentType,
        number_document: input.documentNumber,
        product_number: input.phoneNumber,
      },
    })
    return {
      id: data.id,
      status: data.status,
      otp: {
        token: data.url_services.token,
        sendUrl: data.url_services.code_otp_send,
        validateUrl: data.url_services.code_otp_validate,
      },
    }
  }

  async daviplataOtp(otp: NonNullable<WompiToken['otp']>, code?: string) {
    // Only Wompi's own endpoints, never a URL coming from the client
    for (const url of [otp.sendUrl, otp.validateUrl]) {
      const host = new URL(url).hostname
      if (!host.endsWith('.wompi.co')) throw new WompiError('Enlace de DaviPlata no válido', 422)
    }
    if (code === undefined) {
      await this.request('POST', otp.sendUrl, { key: otp.token, body: {} })
    } else {
      await this.request('POST', otp.validateUrl, { key: otp.token, body: { code } })
    }
  }

  async createBancolombiaToken(redirectUrl: string) {
    const { data } = await this.request<any>('POST', '/tokens/bancolombia_transfer', {
      key: 'public',
      body: { redirect_url: redirectUrl, type_auth: 'TOKEN' },
    })
    return { id: data.id, status: data.status, authorizationUrl: data.authorization_url ?? null }
  }

  async getToken(type: 'nequi' | 'daviplata' | 'bancolombia_transfer', id: string) {
    const { data } = await this.request<any>('GET', `/tokens/${type}/${encodeURIComponent(id)}`, {
      key: 'public',
    })
    return { id: data.id, status: data.status, authorizationUrl: data.authorization_url ?? null }
  }
}

const http = new HttpWompi()
let current: WompiApi = http

/** The Wompi client in use (tests swap it) */
export const wompi = {
  get api(): WompiApi {
    return current
  },
  swap(fake: WompiApi) {
    current = fake
  },
  restore() {
    current = http
  },
}
