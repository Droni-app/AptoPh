import type { HttpContext } from '@adonisjs/core/http'
import { readFile } from 'node:fs/promises'
import FieldException from '#exceptions/field_exception'
import { PropertyImportService } from '#services/property/property_import'
import {
  importFileValidator,
  importPlanValidator,
  importRowValidator,
} from '#validators/property/import'

/**
 * Import of towers, units and people from a CSV (administration). docs/import.md
 */
export default class PropertyImportController {
  /** POST /imports/property/preview: reads the file; writes nothing */
  async preview({ tenant, request }: HttpContext) {
    const { file } = await request.validateUsing(importFileValidator)
    if (!file.tmpPath) throw new FieldException('file', 'No recibimos el archivo')
    const bytes = await readFile(file.tmpPath)
    return { data: await new PropertyImportService(tenant).preview(bytes) }
  }

  /** POST /imports/property/plan: plans the pending rows again */
  async plan({ tenant, request }: HttpContext) {
    const { rows } = await request.validateUsing(importPlanValidator)
    return { data: await new PropertyImportService(tenant).plan(rows) }
  }

  /** POST /imports/property/rows: imports one row (upsert of its tower, unit and person) */
  async apply({ tenant, request }: HttpContext) {
    const { line, input } = await request.validateUsing(importRowValidator)
    if (input.fullName && !input.relationship)
      throw new FieldException('relationship', 'Indica la relación de la persona con la unidad')
    return { data: await new PropertyImportService(tenant).apply(line, input) }
  }
}
