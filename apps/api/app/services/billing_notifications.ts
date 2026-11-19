import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { BILLING_CHARGE_STATUS_LABELS, formatCop, quote, type BillingCycle } from '@aptoph/shared'
import BillingMail, { type BillingMailContent } from '#mails/billing_mail'
import type BillingCharge from '#models/billing_charge'
import Subscription from '#models/subscription'
import Tenant from '#models/tenant'
import { appUrl } from '#services/app_urls'
import { queueMail } from '#services/mailer'

const when = (date: DateTime) => date.setLocale('es').toFormat("d 'de' LLLL 'de' yyyy, h:mm a")
const day = (date: DateTime) => date.setLocale('es').toFormat("d 'de' LLLL 'de' yyyy")

/** Active administrators of the conjunto: they manage the plan and the payment method */
async function administrators(tenantId: string) {
  return (await db
    .from('enrollments as e')
    .join('users as u', 'u.id', 'e.user_id')
    .where('e.tenant_id', tenantId)
    .where('e.role', 'administrator')
    .where('e.status', 'active')
    .whereNotNull('u.email')
    .select('u.email', 'u.full_name as fullName')) as Array<{ email: string; fullName: string }>
}

async function send(tenantId: string, content: BillingMailContent) {
  const tenant = await Tenant.findOrFail(tenantId)
  for (const admin of await administrators(tenantId)) {
    queueMail(new BillingMail(admin, tenant.name, content), 'billing')
  }
}

const planUrl = () => `${appUrl('backoffice')}/plan`

/**
 * Notice of a charge's result, once (claimed with `notified_at`): the receipt
 * when approved; for automatic renewals, also when declined.
 */
export async function notifyChargeResult(charge: BillingCharge) {
  const notify =
    charge.status === 'approved' ||
    (charge.automatic && ['declined', 'error'].includes(charge.status))
  if (!notify) return
  const claimed = await db
    .from('billing_charges')
    .where('id', charge.id)
    .whereNull('notified_at')
    .update({ notified_at: new Date() })
    .returning('id')
  if (claimed.length === 0) return

  const rows = [
    { label: 'Concepto', value: charge.description },
    { label: 'Valor', value: formatCop(charge.amount) },
    { label: 'Medio de pago', value: charge.paymentMethodLabel ?? 'Wompi' },
    { label: 'Referencia', value: charge.reference },
    { label: 'Fecha', value: when(charge.finalizedAt ?? DateTime.now()) },
  ]

  if (charge.status === 'approved') {
    await send(charge.tenantId, {
      subject: `Comprobante de pago · ${formatCop(charge.amount)}`,
      title: 'Recibimos tu pago',
      paragraphs: [
        charge.kind === 'subscription' && charge.periodEndsAt
          ? `Tu plan queda activo hasta el ${day(charge.periodEndsAt)}. Gracias por confiar en AptoPH.`
          : 'Los correos adicionales ya están disponibles este mes. Gracias por confiar en AptoPH.',
        'Este es el comprobante de pago; no es una factura electrónica.',
      ],
      rows,
      action: 'Ver plan y pagos',
      url: planUrl(),
    })
    return
  }

  const subscription = await Subscription.findBy('tenant_id', charge.tenantId)
  const retryAt = subscription?.autoRenew ? subscription.nextRenewalAt : null
  const graceEndsAt = subscription?.graceEndsAt
  await send(charge.tenantId, {
    subject: 'No pudimos renovar tu plan',
    title: 'No pudimos cobrar la renovación',
    paragraphs: [
      `El cobro fue ${BILLING_CHARGE_STATUS_LABELS[charge.status].toLowerCase()}${charge.statusMessage ? `: ${charge.statusMessage}` : '.'}`,
      retryAt
        ? `Lo intentaremos de nuevo el ${day(retryAt)}. Si quieres, actualiza el medio de pago o paga ahora desde Plan y facturación.`
        : 'No haremos más intentos automáticos. Actualiza el medio de pago y paga desde Plan y facturación.',
      graceEndsAt
        ? `Puedes seguir usando AptoPH normalmente hasta el ${day(graceEndsAt)}; después la información quedará en modo consulta hasta que se pague.`
        : '',
    ].filter(Boolean),
    rows: rows.filter((row) => row.label !== 'Fecha'),
    action: 'Actualizar medio de pago',
    url: planUrl(),
  })
}

/** Days before the renewal: how much will be charged and to which method */
export async function notifyUpcomingRenewal(input: {
  tenantId: string
  amount: number
  units: number
  chargeAt: DateTime
  periodEndsAt: DateTime
  paymentMethod: string | null
}) {
  await send(input.tenantId, {
    subject: `Tu plan se renueva el ${day(input.periodEndsAt)}`,
    title: 'Tu plan se renueva pronto',
    paragraphs: [
      `El ${day(input.chargeAt)} cobraremos la renovación de tu plan${input.paymentMethod ? ` a ${input.paymentMethod}` : ''}. El valor se calcula con las ${input.units.toLocaleString('es-CO')} unidades registradas hoy.`,
      'Si no quieres renovarlo, desactiva la renovación automática en Plan y facturación antes de esa fecha.',
    ],
    rows: [
      { label: 'Valor', value: formatCop(input.amount) },
      { label: 'Medio de pago', value: input.paymentMethod ?? 'Sin medio de pago' },
    ],
    action: 'Ver plan y pagos',
    url: planUrl(),
  })
}

/**
 * Manual payment (no saved method), days before the end: link to pay with PSE
 * from any bank, card or wallet, and the annual option as an incentive.
 */
export async function notifyPaymentDue(input: {
  tenantId: string
  periodEndsAt: DateTime
  units: number
  cycle: BillingCycle
}) {
  const monthly = quote(input.units, 'monthly')
  const annual = quote(input.units, 'annual')
  const current = input.cycle === 'annual' ? annual : monthly
  await send(input.tenantId, {
    subject: `Tu plan vence el ${day(input.periodEndsAt)}`,
    title: 'Es hora de pagar tu plan',
    paragraphs: [
      `Tu plan de AptoPH está pagado hasta el ${day(input.periodEndsAt)}. Puedes pagar el siguiente periodo desde ya con PSE (cualquier banco), tarjeta de crédito o débito, Nequi o Bancolombia; el nuevo periodo empieza cuando termine el actual.`,
      input.cycle === 'annual'
        ? 'Tienes el pago anual: un solo pago al año, con 2 meses de ahorro.'
        : `Paga el año y olvídate de pagar cada mes: ${formatCop(annual.total)} por 12 meses (ahorras ${formatCop(annual.annualSavings)}).`,
      'Si prefieres no pensar en esto, guarda una tarjeta (crédito o débito), Nequi, Bancolombia o DaviPlata y lo renovamos automáticamente.',
    ],
    rows: [
      {
        label: input.cycle === 'annual' ? 'Pago anual' : 'Pago mensual',
        value: formatCop(current.total),
      },
      ...(input.cycle === 'annual'
        ? []
        : [{ label: 'Pago anual (12 meses)', value: formatCop(annual.total) }]),
      { label: 'Unidades', value: input.units.toLocaleString('es-CO') },
    ],
    action: 'Pagar ahora',
    url: planUrl(),
  })
}

/** Manual payment: the period ended without payment, grace days to pay */
export async function notifyPaymentOverdue(input: {
  tenantId: string
  graceEndsAt: DateTime
  units: number
}) {
  const annual = quote(input.units, 'annual')
  await send(input.tenantId, {
    subject: 'Tu plan de AptoPH venció',
    title: 'Tu plan venció',
    paragraphs: [
      `No hemos recibido el pago del nuevo periodo. Puedes seguir usando AptoPH normalmente hasta el ${day(input.graceEndsAt)}; después la información quedará en modo consulta hasta que se pague.`,
      `Paga con PSE (cualquier banco), tarjeta de crédito o débito, Nequi o Bancolombia. Pagando el año: ${formatCop(annual.total)} por 12 meses (ahorras ${formatCop(annual.annualSavings)}).`,
    ],
    rows: [],
    action: 'Pagar ahora',
    url: planUrl(),
  })
}
