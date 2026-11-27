import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import wompiConfig from '#config/wompi'
import BillingCharge from '#models/billing/billing_charge'
import { refreshCharge, reopenCheckout } from '#services/billing/billing'
import { verifyEventChecksum } from '#services/billing/wompi'

/**
 * POST /api/v1/webhooks/wompi — Wompi's events (docs/billing.md).
 *
 * The checksum proves the event comes from Wompi; even so, the event only
 * triggers a query to Wompi's API, which is what decides the charge's status.
 * Wompi retries until it gets a 200: an event is recorded once (by checksum)
 * and processed until it succeeds.
 */
export default class WompiController {
  async handle({ request, response }: HttpContext) {
    const event = request.body() as {
      event?: string
      environment?: string
      data?: { transaction?: { id?: string; reference?: string } }
      signature?: { checksum?: string }
    }
    const header = request.header('x-event-checksum')
    if (!wompiConfig.configured || !verifyEventChecksum(event, header)) {
      logger.warn({ event: event?.event }, 'wompi event with an invalid checksum')
      return response.status(401).send({ error: 'invalid checksum' })
    }
    if (event.environment !== wompiConfig.eventEnvironment) {
      logger.warn({ environment: event.environment }, 'wompi event from another environment')
      return response.status(200).send({ ignored: true })
    }

    const checksum = String(header || event.signature?.checksum).toLowerCase()
    const transaction = event.data?.transaction
    await db
      .table('wompi_events')
      .insert({
        event: String(event.event).slice(0, 60),
        environment: event.environment,
        checksum,
        reference: transaction?.reference?.slice(0, 64) ?? null,
        transaction_id: transaction?.id?.slice(0, 64) ?? null,
        payload: JSON.stringify(event),
      })
      .onConflict('checksum')
      .ignore()
    const stored = await db.from('wompi_events').where('checksum', checksum).first()
    if (stored?.processed_at) return response.status(200).send({ duplicate: true })

    if (event.event === 'transaction.updated' && transaction?.reference) {
      const charge = await BillingCharge.findBy('reference', transaction.reference)
      if (charge) {
        // A charge already started in Wompi keeps its transaction; a checkout gets it here
        if (!charge.wompiTransactionId && transaction.id && charge.status === 'pending') {
          charge.wompiTransactionId = transaction.id
          await charge.save()
        }
        if (charge.status === 'pending') {
          await refreshCharge(charge)
        } else if (transaction.id) {
          await reopenCheckout(charge, transaction.id)
        }
      } else {
        logger.warn({ reference: transaction.reference }, 'wompi event for an unknown reference')
      }
    }

    await db.from('wompi_events').where('checksum', checksum).update({ processed_at: new Date() })
    return response.status(200).send({ received: true })
  }
}
