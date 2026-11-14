import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

/**
 * GET /api/v1/dashboard — headline numbers for the back-office home
 */
export default class DashboardController {
  async show({ tenant }: HttpContext) {
    const count = async (table: string, apply?: (query: any) => void) => {
      const query = db.from(table).where('tenant_id', tenant.id)
      apply?.(query)
      const [row] = await query.count('* as total')
      return Number(row.total)
    }

    const [buildings, units, occupiedUnits, occupants, staff, openTickets] = await Promise.all([
      count('buildings'),
      count('units', (q) => q.whereNull('deleted_at')),
      count('units', (q) => q.whereNull('deleted_at').where('status', 'occupied')),
      count('unit_occupants'),
      count('enrollments', (q) => q.where('status', 'active').whereNot('role', 'resident')),
      count('tickets', (q) => q.whereIn('status', ['open', 'in_progress'])),
    ])

    return { data: { buildings, units, occupiedUnits, occupants, staff, openTickets } }
  }
}
