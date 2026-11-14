import type { AmenityRules } from '@apartadock/shared'

const WEEKDAYS: Record<string, string> = {
  monday: 'lunes',
  tuesday: 'martes',
  wednesday: 'miércoles',
  thursday: 'jueves',
  friday: 'viernes',
  saturday: 'sábados',
  sunday: 'domingos',
}

/** "8:00 a 23:00 · máximo 6 h · cerrado los lunes" */
export function describeRules(rules: AmenityRules) {
  const parts: string[] = []
  if (rules.opensAt || rules.closesAt) {
    parts.push(`${rules.opensAt ?? '00:00'} a ${rules.closesAt ?? '24:00'}`)
  }
  if (rules.maxHours) parts.push(`máximo ${rules.maxHours} h`)
  if (rules.closedOn?.length) {
    parts.push(`cerrado los ${rules.closedOn.map((day) => WEEKDAYS[day] ?? day).join(', ')}`)
  }
  if (rules.depositRequired) parts.push('requiere depósito')
  return parts.join(' · ')
}
