import type { SurveyParticipation, SurveyStatus } from '@aptoph/shared'

export const SURVEY_STATUS_COLORS: Record<SurveyStatus, 'warning' | 'success' | 'neutral'> = {
  draft: 'warning',
  open: 'success',
  closed: 'neutral',
}

/** datetime-local value (Bogotá) of an ISO instant */
export const bogotaInput = (iso: string) =>
  new Date(iso)
    .toLocaleString('sv-SE', { timeZone: 'America/Bogota' })
    .slice(0, 16)
    .replace(' ', 'T')

/** datetime-local value (Bogotá) → ISO instant */
export const fromBogotaInput = (value: string) => `${value}:00-05:00`

export const percent = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0)

export const formatPercent = (value: number) =>
  `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`

/** Participation over the total coefficient (0-100) */
export const coefficientShare = (p: SurveyParticipation) =>
  percent(p.votedCoefficient, p.totalCoefficient)

/** "Cierra en 3 días", "Cerró hace 2 horas"… */
export function deadlineLabel(closesAt: string, now = Date.now()) {
  const diff = new Date(closesAt).getTime() - now
  const abs = Math.abs(diff)
  const hours = Math.round(abs / 3_600_000)
  const days = Math.round(abs / 86_400_000)
  const span =
    abs < 3_600_000
      ? `${Math.max(1, Math.round(abs / 60_000))} min`
      : hours < 48
        ? `${hours} ${hours === 1 ? 'hora' : 'horas'}`
        : `${days} días`
  return diff > 0 ? `Cierra en ${span}` : `Cerró hace ${span}`
}
