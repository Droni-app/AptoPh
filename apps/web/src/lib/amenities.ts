import {
  BOOKING_MODE_LABELS,
  BOOKING_MODE_UNITS,
  WEEKDAY_LABELS,
  type Amenity,
  type Booking,
  type BookingStatus,
} from '@aptoph/shared'
import { formatMoney } from '@/lib/format'

/** Formatting of common areas and bookings, in the conjunto's zone */
export const ZONE = 'America/Bogota'

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('es-CO', { timeZone: ZONE, ...options })
const dayFmt = fmt({ weekday: 'long', day: 'numeric', month: 'long' })
const timeFmt = fmt({ hour: 'numeric', minute: '2-digit' })
const isoFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const time = (iso: string) => timeFmt.format(new Date(iso))
const day = (iso: string) => dayFmt.format(new Date(iso))
/** YYYY-MM-DD of an instant in Bogotá */
export const localDate = (iso: string | Date) =>
  isoFmt.format(typeof iso === 'string' ? new Date(iso) : iso)
/** Today in Bogotá, plus `days` */
export function bogotaToday(days = 0) {
  return localDate(new Date(Date.now() + days * 86_400_000))
}

/** "sábado 12 de diciembre · 3:00 p. m. – 9:00 p. m." */
export function formatRange(booking: Pick<Booking, 'startsAt' | 'endsAt'>) {
  const lastMinute = new Date(new Date(booking.endsAt).getTime() - 60_000).toISOString()
  if (localDate(booking.startsAt) === localDate(lastMinute)) {
    return `${day(booking.startsAt)} · ${time(booking.startsAt)} – ${time(booking.endsAt)}`
  }
  return `${day(booking.startsAt)} ${time(booking.startsAt)} – ${day(booking.endsAt)} ${time(booking.endsAt)}`
}

/** "$80.000 por turno" / "Sin costo" */
export function feeLabel(amenity: Pick<Amenity, 'bookingFee' | 'bookingMode'>, currency?: string) {
  if (!amenity.bookingFee || Number(amenity.bookingFee) === 0) return 'Sin costo'
  return `${formatMoney(amenity.bookingFee, currency)} por ${BOOKING_MODE_UNITS[amenity.bookingMode][0]}`
}

/** The schedule and rules in one line: "Por turnos · Noche 18:00–23:00 · cerrado lunes" */
export function scheduleLabel(amenity: Amenity) {
  const r = amenity.rules
  const parts: string[] = [BOOKING_MODE_LABELS[amenity.bookingMode]]
  if (amenity.bookingMode === 'shifts') {
    parts.push((r.shifts ?? []).map((s) => `${s.name} ${s.startsAt}–${s.endsAt}`).join(', '))
  } else if (r.opensAt || r.closesAt) {
    parts.push(`${r.opensAt ?? '00:00'} a ${r.closesAt ?? '24:00'}`)
  }
  if (amenity.bookingMode === 'hours' && r.maxHours) parts.push(`máximo ${r.maxHours} h`)
  if (amenity.bookingMode === 'days' && (r.maxDays ?? 1) > 1) parts.push(`hasta ${r.maxDays} días`)
  if (r.closedOn?.length) {
    parts.push(`cerrado ${r.closedOn.map((d) => WEEKDAY_LABELS[d].toLowerCase()).join(', ')}`)
  }
  return parts.filter(Boolean).join(' · ')
}

export const STATUS_COLORS: Record<BookingStatus, 'warning' | 'success' | 'danger' | 'neutral'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
}

/** Money paid before the booking: the prepaid fee and the deposit */
export const paidUpfront = (booking: Booking) =>
  (booking.paymentMode === 'prepaid' ? Number(booking.feeAmount) : 0) +
  Number(booking.depositAmount)
