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
const dayFmt = fmt({ weekday: 'short', day: 'numeric', month: 'short' })
const timeFmt = fmt({ hour: 'numeric', minute: '2-digit' })
const isoFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export const formatTime = (iso: string) => timeFmt.format(new Date(iso))
export const formatDay = (iso: string) => dayFmt.format(new Date(iso))
/** YYYY-MM-DD of an instant in Bogotá */
export const localDate = (iso: string | Date) =>
  isoFmt.format(typeof iso === 'string' ? new Date(iso) : iso)

/** "sáb 12 dic · 3:00 p. m. – 9:00 p. m." */
export function formatRange(booking: Pick<Booking, 'startsAt' | 'endsAt'>) {
  const lastMinute = new Date(new Date(booking.endsAt).getTime() - 60_000).toISOString()
  if (localDate(booking.startsAt) === localDate(lastMinute)) {
    return `${formatDay(booking.startsAt)} · ${formatTime(booking.startsAt)} – ${formatTime(booking.endsAt)}`
  }
  return `${formatDay(booking.startsAt)} ${formatTime(booking.startsAt)} – ${formatDay(booking.endsAt)} ${formatTime(booking.endsAt)}`
}

/** "$80.000 por turno" / "Sin costo" */
export function feeLabel(amenity: Pick<Amenity, 'bookingFee' | 'bookingMode'>) {
  if (!amenity.bookingFee || Number(amenity.bookingFee) === 0) return 'Sin costo'
  return `${formatMoney(amenity.bookingFee)} por ${BOOKING_MODE_UNITS[amenity.bookingMode][0]}`
}

/** The schedule in one line: "Por horas · 10:00 a 21:00 · cerrado lunes" */
export function scheduleLabel(amenity: Amenity) {
  const r = amenity.rules
  const parts: string[] = [BOOKING_MODE_LABELS[amenity.bookingMode]]
  if (amenity.bookingMode === 'shifts') {
    parts.push(
      (r.shifts ?? []).map((s) => `${s.name} ${s.startsAt}–${s.endsAt}`).join(', ') || 'sin turnos',
    )
  } else if (r.opensAt || r.closesAt) {
    parts.push(`${r.opensAt ?? '00:00'} a ${r.closesAt ?? '24:00'}`)
  }
  if (r.closedOn?.length) {
    parts.push(`cerrado ${r.closedOn.map((d) => WEEKDAY_LABELS[d].toLowerCase()).join(', ')}`)
  }
  return parts.join(' · ')
}

export const STATUS_COLORS: Record<BookingStatus, 'warning' | 'success' | 'danger' | 'neutral'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
}

/** Who the booking is for: "Torre 1 · 302", "Lucía Méndez (invitada de 302)" */
export function bookedFor(booking: Booking) {
  const unit = booking.unit
    ? `${booking.unit.building ? `${booking.unit.building.name} · ` : ''}${booking.unit.code}`
    : null
  if (booking.bookingType === 'block') return booking.notes ?? 'Bloqueo'
  if (booking.bookingType === 'external') return booking.holder?.name ?? 'Tercero'
  if (booking.bookingType === 'guest') return `${booking.holder?.name} · invitado de ${unit}`
  return unit ?? ''
}
