import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { FINANCE_WRITE_ROLES, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@aptoph/shared'
import type Payment from '#models/finance/payment'
import Tenant from '#models/tenants/tenant'
import { NotificationService } from '#services/notifications/notifications'
import { tenantToday } from '#services/resident_scope'

/**
 * Notifications of the finance module (category `finance`,
 * docs/notifications.md): fees generated, payments reviewed and due reminders.
 */

const pesos = (cents: number) => `$${Math.round(cents / 100).toLocaleString('es-CO')}`
const amountOf = (value: string) => pesos(Math.round(Number(value) * 100))
const monthOf = (period: string) =>
  DateTime.fromISO(period).setLocale('es-CO').toFormat('LLLL yyyy')
const dayOf = (iso: string) => DateTime.fromISO(iso).setLocale('es-CO').toFormat("d 'de' LLLL")

/** The new charges of a month, to the people of each unit (one notification per unit) */
export async function notifyChargesGenerated(
  tenant: Tenant,
  period: string,
  charges: Array<{ unitId: string; amount: string; dueOn: string }>
) {
  const notifications = new NotificationService(tenant)
  const byUnit = new Map<string, { cents: number; dueOn: string }>()
  for (const charge of charges) {
    const row = byUnit.get(charge.unitId) ?? { cents: 0, dueOn: charge.dueOn }
    row.cents += Math.round(Number(charge.amount) * 100)
    if (charge.dueOn < row.dueOn) row.dueOn = charge.dueOn
    byUnit.set(charge.unitId, row)
  }
  const month = monthOf(period)
  for (const [unitId, { cents, dueOn }] of byUnit) {
    if (cents <= 0) continue
    await notifications.notify(await notifications.residentsOf([unitId]), {
      app: 'web',
      category: 'finance',
      type: 'charges.generated',
      title: `Tu cuenta de ${month}: ${pesos(cents)}`,
      body: `Vence el ${dayOf(dueOn)}.`,
      path: `/unidades/${unitId}`,
      dedupeKey: `charges:${period.slice(0, 7)}:${unitId}`,
      email: {
        paragraphs: [`Ya está tu cuenta de ${month}. Puedes ver el detalle y pagar en el portal.`],
        rows: [
          { label: 'Total del mes', value: pesos(cents) },
          { label: 'Vence', value: dayOf(dueOn) },
        ],
        action: 'Ver mi estado de cuenta',
      },
    })
  }
}

/** A resident reported a payment: the people who review them */
export async function notifyPaymentReported(tenant: Tenant, payment: Payment, by: string) {
  const notifications = new NotificationService(tenant)
  await notifications.notify(await notifications.staffWith(FINANCE_WRITE_ROLES), {
    app: 'backoffice',
    category: 'finance',
    type: 'payment.reported',
    title: `Pago reportado por confirmar: ${amountOf(payment.amount)}`,
    body: [payment.unit ? `Unidad ${payment.unit.code}` : null, by].filter(Boolean).join(' · '),
    path: '/finanzas/recaudo?estado=pending_review',
  })
}

/** Confirmed, rejected or registered by the administration: to the unit */
export async function notifyPaymentReviewed(
  tenant: Tenant,
  payment: Payment,
  outcome: 'confirmed' | 'rejected' | 'registered'
) {
  const notifications = new NotificationService(tenant)
  const amount = amountOf(payment.amount)
  const method = PAYMENT_METHOD_LABELS[payment.method as PaymentMethod] ?? payment.method
  const content = {
    confirmed: {
      title: `Confirmamos tu pago de ${amount}`,
      body: 'Ya está aplicado a tu estado de cuenta.',
    },
    registered: {
      title: `Registramos tu pago de ${amount}`,
      body: `${method}. Ya está aplicado a tu estado de cuenta.`,
    },
    rejected: {
      title: `No pudimos confirmar tu pago de ${amount}`,
      body: payment.rejectionReason ?? 'Revisa el soporte o comunícate con la administración.',
    },
  }[outcome]
  await notifications.notify(await notifications.residentsOf([payment.unitId]), {
    app: 'web',
    category: 'finance',
    type: `payment.${outcome}`,
    title: content.title,
    body: content.body,
    path: `/unidades/${payment.unitId}`,
    dedupeKey: `payment:${outcome}:${payment.id}`,
    email: {
      paragraphs: [content.body],
      rows: [
        { label: 'Valor', value: amount },
        { label: 'Medio', value: method },
        ...(payment.reference ? [{ label: 'Referencia', value: payment.reference }] : []),
      ],
      action: 'Ver mi estado de cuenta',
    },
  })
}

/** Days before the due date of the reminder */
export const DUE_REMINDER_DAYS = 3

/**
 * Charges due in DUE_REMINDER_DAYS days with balance: a reminder to the
 * unit, once per charge. Runs hourly from the scheduler, for every conjunto.
 */
export async function remindDueCharges() {
  const tenants = await Tenant.query().where('status', 'active')
  for (const tenant of tenants) {
    try {
      const due = DateTime.fromISO(tenantToday(tenant))
        .plus({ days: DUE_REMINDER_DAYS })
        .toISODate()!
      const rows = await db
        .from('charges')
        .where('tenant_id', tenant.id)
        .where('due_on', due)
        .where('balance', '>', 0)
        .whereNotIn('status', ['cancelled', 'paid'])
        .groupBy('unit_id')
        .select('unit_id')
        .sum('balance as balance')
      const notifications = new NotificationService(tenant)
      for (const row of rows) {
        const balance = pesos(Math.round(Number(row.balance) * 100))
        await notifications.notify(await notifications.residentsOf([row.unit_id]), {
          app: 'web',
          category: 'finance',
          type: 'charges.due_soon',
          title: `Tu cuenta vence el ${dayOf(due)}: ${balance}`,
          body: 'Paga a tiempo y evita intereses de mora.',
          path: `/unidades/${row.unit_id}`,
          dedupeKey: `due:${due}:${row.unit_id}`,
          email: {
            paragraphs: [
              `Tu cuenta vence en ${DUE_REMINDER_DAYS} días. Paga a tiempo y evita intereses de mora.`,
            ],
            rows: [
              { label: 'Saldo por vencer', value: balance },
              { label: 'Vence', value: dayOf(due) },
            ],
            action: 'Pagar o reportar un pago',
          },
        })
      }
    } catch (err) {
      logger.error({ err, tenantId: tenant.id }, 'could not send due reminders')
    }
  }
}
