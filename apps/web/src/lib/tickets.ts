import type { TicketStatus } from '@aptoph/shared'

export const TICKET_STATUS_COLORS: Record<TicketStatus, 'primary' | 'warning' | 'success' | 'neutral'> = {
  open: 'primary',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'neutral',
}
