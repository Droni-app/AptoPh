import { createHash } from 'node:crypto'
import type { PaymentMethodType } from '@aptoph/shared'
import {
  WompiError,
  type WompiApi,
  type WompiPaymentSource,
  type WompiToken,
  type WompiTransaction,
  type WompiTransactionStatus,
} from '#services/wompi'

type Outcome = Exclude<WompiTransactionStatus, 'PENDING'>

/**
 * In-memory Wompi for tests: never touches the network. Transactions start
 * PENDING (like Wompi's) and end with the outcome of their payment source when
 * `settle()` runs. docs/billing.md
 */
export class FakeWompi implements WompiApi {
  sources = new Map<number, WompiPaymentSource & { email: string; outcome: Outcome }>()
  transactions = new Map<string, WompiTransaction & { sourceId: number | null }>()
  usedAcceptanceTokens = new Set<string>()
  voided: number[] = []
  /** Next payment source: how its charges end */
  nextOutcome: Outcome = 'APPROVED'
  /** Make the next createTransaction fail like Wompi's 422 */
  rejectNextTransaction: string | null = null
  private sequence = 1000
  private acceptanceSequence = 0

  async acceptance() {
    this.acceptanceSequence++
    return {
      acceptanceToken: `acceptance-${this.acceptanceSequence}-policy-token`,
      policyUrl: 'https://wompi.co/terminos.pdf',
      personalAuthToken: `acceptance-${this.acceptanceSequence}-personal-token`,
      personalDataUrl: 'https://wompi.co/datos.pdf',
    }
  }

  async createPaymentSource(input: Parameters<WompiApi['createPaymentSource']>[0]) {
    // Wompi's acceptance tokens are single-use
    if (this.usedAcceptanceTokens.has(input.acceptanceToken)) {
      throw new WompiError('El token de aceptación ya fue usado', 422)
    }
    this.usedAcceptanceTokens.add(input.acceptanceToken)
    if (input.token === 'tok_invalid') throw new WompiError('El token no es válido', 422)
    const id = ++this.sequence
    const publicData: Record<string, unknown> =
      input.type === 'CARD'
        ? { bin: '424242', last_four: '4242', type: 'CARD' }
        : { phone_number: '3991111111', type: input.type }
    const source = {
      id,
      type: input.type as PaymentMethodType,
      status: 'AVAILABLE',
      publicData,
      email: input.customerEmail,
      outcome: this.nextOutcome,
    }
    this.sources.set(id, source)
    return source
  }

  async voidPaymentSource(id: number) {
    this.voided.push(id)
  }

  async createTransaction(input: Parameters<WompiApi['createTransaction']>[0]) {
    if (this.rejectNextTransaction) {
      const message = this.rejectNextTransaction
      this.rejectNextTransaction = null
      throw new WompiError(message, 422)
    }
    if ([...this.transactions.values()].some((t) => t.reference === input.reference)) {
      throw new WompiError('La referencia ya ha sido usada', 422)
    }
    const source = this.sources.get(input.paymentSourceId)
    if (!source) throw new WompiError('La fuente de pago no existe', 422)
    if (source.type === 'CARD' && !input.installments) {
      throw new WompiError('No se especificó el número de cuotas (installments)', 422)
    }
    return this.record(input.reference, input.amountInCents, input.paymentSourceId)
  }

  /** A payment made in Wompi's checkout (no saved payment source) */
  checkoutPayment(reference: string, amountInCents: number, method = 'PSE') {
    return this.record(reference, amountInCents, null, method)
  }

  private record(
    reference: string,
    amountInCents: number,
    sourceId: number | null,
    paymentMethodType = 'CARD'
  ) {
    const transaction = {
      id: `tx-${++this.sequence}`,
      reference,
      status: 'PENDING' as WompiTransactionStatus,
      statusMessage: null,
      amountInCents,
      currency: 'COP',
      paymentMethodType,
      sourceId,
    }
    this.transactions.set(transaction.id, transaction)
    return { ...transaction }
  }

  /** Ends every pending transaction with its source's outcome (or the given one) */
  settle(outcome?: Outcome) {
    for (const transaction of this.transactions.values()) {
      if (transaction.status !== 'PENDING') continue
      const final =
        outcome ??
        (transaction.sourceId ? this.sources.get(transaction.sourceId)!.outcome : 'APPROVED')
      transaction.status = final
      transaction.statusMessage = final === 'DECLINED' ? 'Fondos insuficientes' : null
    }
  }

  async getTransaction(id: string) {
    const transaction = this.transactions.get(id)
    return transaction ? { ...transaction } : null
  }

  async findTransactionByReference(reference: string) {
    const rows = [...this.transactions.values()].filter((t) => t.reference === reference)
    const found = rows.find((t) => t.status === 'APPROVED') ?? rows[0]
    return found ? { ...found } : null
  }

  async createNequiToken(phoneNumber: string): Promise<WompiToken> {
    if (!phoneNumber.startsWith('3')) throw new WompiError('Número no válido', 422)
    return { id: `nequi_test_${phoneNumber}`, status: 'PENDING' }
  }

  otpCodes: string[] = []
  async createDaviplataToken(input: Parameters<WompiApi['createDaviplataToken']>[0]) {
    return {
      id: `daviplata_test_${input.phoneNumber}`,
      status: 'PENDING',
      otp: {
        token: 'pub_test_otp',
        sendUrl: 'https://api-sandbox.wompi.co/v1/otp?operation=RESEND_OTP',
        validateUrl: 'https://api-sandbox.wompi.co/v1/otp?operation=VALIDATE_OTP_API',
      },
    }
  }

  daviplataApproved = new Set<string>()
  async daviplataOtp(otp: NonNullable<WompiToken['otp']>, code?: string) {
    if (code === undefined) return
    if (code !== '574829') throw new WompiError('El código no es válido', 422)
    this.otpCodes.push(code)
    this.daviplataApproved.add(otp.token)
  }

  async createBancolombiaToken(redirectUrl: string) {
    return {
      id: 'bancolombia_test_1',
      status: 'PENDING',
      authorizationUrl: `https://bancolombia.test/autorizar?redirect=${encodeURIComponent(redirectUrl)}`,
    }
  }

  async getToken(type: 'nequi' | 'daviplata' | 'bancolombia_transfer', id: string) {
    const approved = type !== 'daviplata' || this.daviplataApproved.size > 0
    return { id, status: approved ? 'APPROVED' : 'PENDING' }
  }
}

/** A Wompi event signed with the test events secret (.env.test) */
export function signedEvent(
  transaction: WompiTransaction,
  options: { environment?: string; secret?: string } = {}
) {
  const timestamp = Math.floor(Date.now() / 1000)
  const data = {
    transaction: {
      id: transaction.id,
      status: transaction.status,
      amount_in_cents: transaction.amountInCents,
      reference: transaction.reference,
      currency: transaction.currency,
    },
  }
  const properties = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents']
  const values = `${data.transaction.id}${data.transaction.status}${data.transaction.amount_in_cents}`
  const checksum = createHash('sha256')
    .update(`${values}${timestamp}${options.secret ?? 'test_events_fake'}`)
    .digest('hex')
  return {
    event: 'transaction.updated',
    data,
    environment: options.environment ?? 'test',
    signature: { properties, checksum },
    timestamp,
    sent_at: new Date().toISOString(),
  }
}
