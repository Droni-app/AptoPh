import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { parse } from 'csv-parse/sync'
import {
  DOCUMENT_TYPES,
  IMPORT_COLUMNS,
  IMPORT_MAX_ROWS,
  OCCUPANT_RELATIONSHIP_LABELS,
  UNIT_STATUS_LABELS,
  UNIT_TYPE_LABELS,
  type DocumentType,
  type ImportAction,
  type ImportChange,
  type ImportField,
  type ImportIssue,
  type ImportPlanRow,
  type ImportRowInput,
  type OccupantRelationship,
  type UnitStatus,
  type UnitType,
} from '@aptoph/shared'
import FieldException from '#exceptions/field_exception'
import Building from '#models/property/building'
import Unit from '#models/property/unit'
import UnitOccupant from '#models/property/unit_occupant'
import type Tenant from '#models/tenants/tenant'

/**
 * Bulk import of towers, units and people from a CSV. docs/import.md
 *
 * 1. preview(): reads the file and plans each row against the conjunto (what is new,
 *    what changes). Nothing is written.
 * 2. apply(): the administrator imports one row at a time: upsert of its tower, unit and
 *    person in a transaction. Empty cells keep what exists.
 */

// ---------------------------------------------------------------- reading the file

/** UTF-8, or Windows-1252 (what Excel writes when it saves "CSV" on Windows) */
export function decodeCsv(bytes: Buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '')
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

/** Comparable form of headers and words: no accents, case or symbols */
export function normalizeKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Comparable form of names and codes: no accents, case or extra spaces */
const nameKey = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

function detectDelimiter(text: string) {
  const header = text.split(/\r?\n/, 1)[0] ?? ''
  const counts = [';', ',', '\t'].map((d) => [d, header.split(d).length - 1] as const)
  counts.sort((a, b) => b[1] - a[1])
  return counts[0]![1] > 0 ? counts[0]![0] : ','
}

const HEADERS = new Map<string, ImportField>()
for (const column of IMPORT_COLUMNS) {
  for (const name of [column.header, column.label, ...column.aliases])
    HEADERS.set(normalizeKey(name), column.field)
}

// ---------------------------------------------------------------- values

const words = <T extends string>(entries: Record<string, readonly string[]>) => {
  const map = new Map<string, T>()
  for (const [value, names] of Object.entries(entries))
    for (const name of [value, ...names]) map.set(normalizeKey(name), value as T)
  return map
}

const UNIT_TYPE_WORDS = words<UnitType>({
  apartment: [UNIT_TYPE_LABELS.apartment, 'apto', 'apartamentos'],
  house: [UNIT_TYPE_LABELS.house, 'casas'],
  commercial: [UNIT_TYPE_LABELS.commercial, 'local', 'comercial', 'oficina'],
  parking: [UNIT_TYPE_LABELS.parking, 'garaje', 'parqueo'],
  storage: [UNIT_TYPE_LABELS.storage, 'deposito', 'bodega', 'cuarto_util'],
})
const UNIT_STATUS_WORDS = words<UnitStatus>({
  occupied: [UNIT_STATUS_LABELS.occupied, 'ocupado', 'habitada', 'habitado'],
  vacant: [UNIT_STATUS_LABELS.vacant, 'desocupado', 'vacia', 'vacio', 'libre', 'disponible'],
  under_construction: [UNIT_STATUS_LABELS.under_construction, 'construccion', 'en_obra', 'obra'],
})
const RELATIONSHIP_WORDS = words<OccupantRelationship>({
  owner: [OCCUPANT_RELATIONSHIP_LABELS.owner, 'propietaria', 'dueno', 'duena', 'propietarios'],
  renter: [OCCUPANT_RELATIONSHIP_LABELS.renter, 'arrendataria', 'inquilino', 'inquilina'],
  family_member: [OCCUPANT_RELATIONSHIP_LABELS.family_member, 'familia', 'residente'],
  domestic_worker: [
    OCCUPANT_RELATIONSHIP_LABELS.domestic_worker,
    'empleada_domestica',
    'empleado',
    'empleada',
  ],
  other: [OCCUPANT_RELATIONSHIP_LABELS.other],
})
const DOCUMENT_WORDS = words<DocumentType>({
  CC: ['cedula', 'cedula_de_ciudadania', 'c_c'],
  CE: ['cedula_de_extranjeria', 'c_e'],
  NIT: ['nit'],
  PP: ['pasaporte', 'pa'],
  TI: ['tarjeta_de_identidad', 't_i'],
})
const YES = new Set(['si', 's', 'x', '1', 'true', 'verdadero', 'yes'])
const NO = new Set(['no', 'n', '0', 'false', 'falso'])

/** "1.234,5", "62,5", "62.5", "1,25 %", "62 m2" */
function parseNumber(value: string) {
  let text = value.replace(/%|m2|m²|\s/gi, '')
  if (text.includes(',') && text.includes('.')) {
    text =
      text.lastIndexOf(',') > text.lastIndexOf('.')
        ? text.replace(/\./g, '').replace(',', '.')
        : text.replace(/,/g, '')
  } else text = text.replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null
  return Number(text)
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emptyInput = (): ImportRowInput => ({
  building: null,
  code: '',
  type: null,
  floor: null,
  privateArea: null,
  coefficient: null,
  status: null,
  fullName: null,
  relationship: null,
  documentType: null,
  documentNumber: null,
  phone: null,
  email: null,
  isPrimaryContact: null,
  isBillingResponsible: null,
})

const PERSON_FIELDS: ImportField[] = [
  'relationship',
  'documentType',
  'documentNumber',
  'phone',
  'email',
  'isPrimaryContact',
  'isBillingResponsible',
]

/** Reads and checks the cells of a row */
export function readRow(cells: Partial<Record<ImportField, string>>) {
  const input = emptyInput()
  const errors: ImportIssue[] = []
  const fail = (field: ImportField, message: string) => errors.push({ field, message })
  const text = (field: ImportField, max: number) => {
    const value = (cells[field] ?? '').replace(/\s+/g, ' ').trim()
    if (!value) return null
    if (value.length > max) fail(field, `Tiene más de ${max} caracteres`)
    return value
  }
  const pick = <T>(field: ImportField, map: Map<string, T>, message: string) => {
    const value = (cells[field] ?? '').trim()
    if (!value) return null
    const found = map.get(normalizeKey(value))
    if (found === undefined) fail(field, `${message}: «${value}»`)
    return found ?? null
  }
  const yesNo = (field: ImportField) => {
    const value = normalizeKey(cells[field] ?? '')
    if (!value) return null
    if (YES.has(value)) return true
    if (NO.has(value)) return false
    fail(field, `Escribe Sí o No, no «${cells[field]}»`)
    return null
  }
  const number = (field: ImportField, min: number, max: number, decimals: number) => {
    const raw = (cells[field] ?? '').trim()
    if (!raw) return null
    const value = parseNumber(raw)
    if (value === null) {
      fail(field, `No es un número: «${raw}»`)
      return null
    }
    if (value < min || value > max) {
      fail(field, `Debe estar entre ${min} y ${max}`)
      return null
    }
    const factor = 10 ** decimals
    return Math.round(value * factor) / factor
  }

  input.building = text('building', 80)
  input.code = text('code', 30) ?? ''
  if (!input.code) fail('code', 'Falta el código de la unidad')
  input.type = pick('type', UNIT_TYPE_WORDS, 'Tipo de unidad desconocido')
  input.floor = number('floor', -10, 200, 0)
  input.privateArea = number('privateArea', 0, 100000, 2)
  input.coefficient = number('coefficient', 0, 100, 4)
  input.status = pick('status', UNIT_STATUS_WORDS, 'Estado desconocido')

  input.fullName = text('fullName', 150)
  if (input.fullName && input.fullName.length < 2) fail('fullName', 'El nombre es muy corto')
  input.relationship = pick('relationship', RELATIONSHIP_WORDS, 'Relación desconocida')
  const document = (cells.documentType ?? '').trim()
  input.documentType = document
    ? (DOCUMENT_TYPES as readonly string[]).includes(document.toUpperCase())
      ? (document.toUpperCase() as DocumentType)
      : pick('documentType', DOCUMENT_WORDS, 'Tipo de documento desconocido')
    : null
  const documentNumber = text('documentNumber', 30)
  input.documentNumber = documentNumber ? documentNumber.replace(/[.\s]/g, '') : null
  input.phone = text('phone', 30)
  const email = text('email', 254)?.toLowerCase() ?? null
  if (email && !EMAIL.test(email)) fail('email', `El correo no es válido: «${email}»`)
  input.email = email
  input.isPrimaryContact = yesNo('isPrimaryContact')
  input.isBillingResponsible = yesNo('isBillingResponsible')

  if (input.fullName && !input.relationship && !errors.some((e) => e.field === 'relationship'))
    fail('relationship', 'Indica la relación con la unidad (Propietario, Arrendatario…)')
  if (!input.fullName && PERSON_FIELDS.some((field) => (cells[field] ?? '').trim()))
    fail('fullName', 'Hay datos de una persona pero falta su nombre')
  return { input, errors }
}

/** Rows of the file with their cells by field */
export function readCsv(bytes: Buffer) {
  const text = decodeCsv(bytes)
  const delimiter = detectDelimiter(text)
  let records: string[][]
  try {
    records = parse(text, {
      delimiter,
      relax_column_count: true,
      relax_quotes: true,
      skip_empty_lines: true,
    }) as string[][]
  } catch {
    throw new FieldException('file', 'No pudimos leer el archivo. Revisa que sea un CSV.')
  }
  const [header, ...body] = records
  if (!header) throw new FieldException('file', 'El archivo está vacío')
  const fields = header.map((name) => HEADERS.get(normalizeKey(name)) ?? null)
  if (!fields.includes('code')) {
    throw new FieldException(
      'file',
      'No encontramos la columna «unidad». Usa los encabezados del archivo de ejemplo.'
    )
  }
  const rows = body
    .map((cells, index) => ({ cells, line: index + 2 }))
    .filter(({ cells }) => cells.some((cell) => cell.trim()))
  if (rows.length === 0) throw new FieldException('file', 'El archivo no tiene filas para importar')
  if (rows.length > IMPORT_MAX_ROWS) {
    throw new FieldException(
      'file',
      `El archivo tiene ${rows.length} filas; el máximo es ${IMPORT_MAX_ROWS}. Divídelo en varios.`
    )
  }
  const ignored = header.filter((_, i) => fields[i] === null).filter((name) => name.trim())
  return {
    delimiter,
    ignored,
    rows: rows.map(({ cells, line }) => {
      const byField: Partial<Record<ImportField, string>> = {}
      fields.forEach((field, i) => {
        if (field && byField[field] === undefined) byField[field] = cells[i] ?? ''
      })
      return { line, ...readRow(byField) }
    }),
  }
}

// ---------------------------------------------------------------- planning

type UnitRow = Pick<
  Unit,
  | 'id'
  | 'buildingId'
  | 'code'
  | 'type'
  | 'floor'
  | 'privateArea'
  | 'ownershipCoefficient'
  | 'status'
>
type PersonRow = Pick<
  UnitOccupant,
  | 'id'
  | 'unitId'
  | 'fullName'
  | 'documentType'
  | 'documentNumber'
  | 'phone'
  | 'email'
  | 'relationship'
  | 'isPrimaryContact'
  | 'isBillingResponsible'
>

/** The conjunto's towers, units and people, to compare the rows with */
class Snapshot {
  buildings = new Map<string, { id: string; name: string }>()
  units = new Map<string, UnitRow>()
  people = new Map<string, PersonRow[]>()

  static async load(tenant: Tenant, client?: TransactionClientContract) {
    const snapshot = new Snapshot()
    const [buildings, units, people] = await Promise.all([
      Building.query({ client }).where('tenant_id', tenant.id),
      Unit.query({ client }).where('tenant_id', tenant.id).whereNull('deleted_at'),
      UnitOccupant.query({ client }).where('tenant_id', tenant.id),
    ])
    for (const b of buildings) snapshot.buildings.set(nameKey(b.name), { id: b.id, name: b.name })
    for (const u of units) snapshot.units.set(Snapshot.unitKey(u.buildingId, u.code), u)
    for (const p of people) {
      const list = snapshot.people.get(p.unitId) ?? []
      list.push(p)
      snapshot.people.set(p.unitId, list)
    }
    return snapshot
  }

  static unitKey(buildingId: string | null, code: string) {
    return `${buildingId ?? '-'}|${nameKey(code)}`
  }

  building(name: string | null) {
    return name ? (this.buildings.get(nameKey(name)) ?? null) : null
  }

  unit(input: ImportRowInput) {
    const building = this.building(input.building)
    if (input.building && !building) return null
    return this.units.get(Snapshot.unitKey(building?.id ?? null, input.code)) ?? null
  }

  /** The same person in the unit: by document, then email, then name */
  person(unitId: string, input: ImportRowInput) {
    const people = this.people.get(unitId) ?? []
    const documentOf = (p: PersonRow) => p.documentNumber?.replace(/[.\s]/g, '') ?? null
    const compatible = (p: PersonRow) =>
      (!input.documentNumber || !documentOf(p) || documentOf(p) === input.documentNumber) &&
      (!input.email || !p.email || p.email.toLowerCase() === input.email)
    if (input.documentNumber) {
      const found = people.find((p) => documentOf(p) === input.documentNumber)
      if (found) return found
    }
    if (input.email) {
      const found = people.find((p) => p.email?.toLowerCase() === input.email && compatible(p))
      if (found) return found
    }
    return (
      people.find((p) => nameKey(p.fullName) === nameKey(input.fullName!) && compatible(p)) ?? null
    )
  }
}

const LABELS = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c.field, c.label])) as Record<
  ImportField,
  string
>
const formatNumber = (value: number, decimals = 2) =>
  value.toLocaleString('es-CO', { maximumFractionDigits: decimals })
const yesNoLabel = (value: boolean) => (value ? 'Sí' : 'No')

/** The unit fields the row would change, with what it has and what it would get */
function unitChanges(unit: UnitRow, input: ImportRowInput) {
  const changes: ImportChange[] = []
  const add = (field: ImportField, from: string | null, to: string | null) => {
    if (from !== to) changes.push({ field, label: LABELS[field], from, to })
  }
  if (input.type) add('type', UNIT_TYPE_LABELS[unit.type], UNIT_TYPE_LABELS[input.type])
  if (input.floor !== null)
    add('floor', unit.floor === null ? null : String(unit.floor), String(input.floor))
  if (input.privateArea !== null)
    add(
      'privateArea',
      unit.privateArea === null ? null : formatNumber(Number(unit.privateArea)),
      formatNumber(input.privateArea)
    )
  if (input.coefficient !== null)
    add(
      'coefficient',
      `${formatNumber(Number(unit.ownershipCoefficient) * 100, 4)} %`,
      `${formatNumber(input.coefficient, 4)} %`
    )
  if (input.status) add('status', UNIT_STATUS_LABELS[unit.status], UNIT_STATUS_LABELS[input.status])
  return changes
}

function personChanges(person: PersonRow, input: ImportRowInput) {
  const changes: ImportChange[] = []
  const add = (field: ImportField, from: string | null, to: string | null) => {
    if (from !== to) changes.push({ field, label: LABELS[field], from, to })
  }
  if (input.fullName) add('fullName', person.fullName, input.fullName)
  if (input.relationship)
    add(
      'relationship',
      OCCUPANT_RELATIONSHIP_LABELS[person.relationship],
      OCCUPANT_RELATIONSHIP_LABELS[input.relationship]
    )
  if (input.documentType) add('documentType', person.documentType, input.documentType)
  if (input.documentNumber)
    add(
      'documentNumber',
      person.documentNumber?.replace(/[.\s]/g, '') ?? null,
      input.documentNumber
    )
  if (input.phone) add('phone', person.phone, input.phone)
  if (input.email) add('email', person.email?.toLowerCase() ?? null, input.email)
  if (input.isPrimaryContact !== null)
    add('isPrimaryContact', yesNoLabel(person.isPrimaryContact), yesNoLabel(input.isPrimaryContact))
  if (input.isBillingResponsible !== null)
    add(
      'isBillingResponsible',
      yesNoLabel(person.isBillingResponsible),
      yesNoLabel(input.isBillingResponsible)
    )
  return changes
}

function planRow(
  snapshot: Snapshot,
  line: number,
  input: ImportRowInput | null,
  errors: ImportIssue[]
): ImportPlanRow {
  const row: ImportPlanRow = {
    line,
    input,
    errors,
    warnings: [],
    status: 'error',
    building: { action: 'none', name: input?.building ?? null },
    unit: { action: 'none', id: null, changes: [] },
    person: { action: 'none', id: null, changes: [] },
  }
  if (!input || errors.length) return row

  const building = snapshot.building(input.building)
  if (input.building)
    row.building = {
      action: building ? 'unchanged' : 'create',
      name: building?.name ?? input.building,
    }

  const unit = snapshot.unit(input)
  if (!unit) row.unit.action = 'create'
  else {
    const changes = unitChanges(unit, input)
    row.unit = { action: changes.length ? 'update' : 'unchanged', id: unit.id, changes }
  }

  if (input.fullName) {
    const person = unit ? snapshot.person(unit.id, input) : null
    if (!person) row.person.action = 'create'
    else {
      const changes = personChanges(person, input)
      row.person = { action: changes.length ? 'update' : 'unchanged', id: person.id, changes }
    }
  }

  const actions: ImportAction[] = [row.unit.action, row.person.action]
  row.status =
    row.building.action === 'create' || actions.includes('create')
      ? 'create'
      : actions.includes('update')
        ? 'update'
        : 'unchanged'
  return row
}

/** Rows that describe the same unit and person as an earlier one */
function markRepeated(rows: ImportPlanRow[]) {
  const seen = new Map<string, number>()
  for (const row of rows) {
    if (!row.input) continue
    const person = row.input.fullName
      ? (row.input.documentNumber ?? row.input.email ?? nameKey(row.input.fullName))
      : ''
    const key = `${nameKey(row.input.building ?? '')}|${nameKey(row.input.code)}|${person}`
    const first = seen.get(key)
    if (first !== undefined)
      row.warnings.push(
        row.input.fullName
          ? `La misma persona y unidad ya están en la fila ${first}`
          : `La misma unidad ya está en la fila ${first}`
      )
    else seen.set(key, row.line)
  }
  return rows
}

export class PropertyImportService {
  constructor(private tenant: Tenant) {}

  /** Reads the file and plans its rows */
  async preview(bytes: Buffer) {
    const file = readCsv(bytes)
    const snapshot = await Snapshot.load(this.tenant)
    const rows = markRepeated(
      file.rows.map((row) => planRow(snapshot, row.line, row.input, row.errors))
    )
    if (file.ignored.length) {
      const note = `Columnas que no se importan: ${file.ignored.join(', ')}`
      rows[0]?.warnings.push(note)
    }
    return { delimiter: file.delimiter, rows }
  }

  /** Plans rows again (after importing some, the rest may have changed) */
  async plan(rows: Array<{ line: number; input: ImportRowInput }>) {
    const snapshot = await Snapshot.load(this.tenant)
    return markRepeated(rows.map((row) => planRow(snapshot, row.line, row.input, [])))
  }

  /** Upsert of the row's tower, unit and person */
  async apply(line: number, input: ImportRowInput) {
    const unitId = await db.transaction(async (trx) => {
      // One import at a time per conjunto: two rows of the same new tower or unit
      // imported at once would both try to create it
      await trx.rawQuery('select pg_advisory_xact_lock(hashtext(?))', [
        `property-import:${this.tenant.id}`,
      ])
      const snapshot = await Snapshot.load(this.tenant, trx)

      let building = snapshot.building(input.building)
      if (input.building && !building) {
        const last = await Building.query({ client: trx })
          .where('tenant_id', this.tenant.id)
          .max('sort_order as max')
          .first()
        const created = await Building.create(
          {
            tenantId: this.tenant.id,
            name: input.building,
            sortOrder: Number(last?.$extras.max ?? -1) + 1,
          },
          { client: trx }
        )
        building = { id: created.id, name: created.name }
      }

      let unit = snapshot.unit(input) as Unit | null
      const fields = {
        ...(input.type ? { type: input.type } : {}),
        ...(input.floor !== null ? { floor: input.floor } : {}),
        ...(input.privateArea !== null ? { privateArea: input.privateArea.toFixed(2) } : {}),
        ...(input.coefficient !== null
          ? { ownershipCoefficient: (input.coefficient / 100).toFixed(6) }
          : {}),
        ...(input.status ? { status: input.status } : {}),
      }
      if (!unit) {
        unit = await Unit.create(
          {
            tenantId: this.tenant.id,
            buildingId: building?.id ?? null,
            parentUnitId: null,
            code: input.code,
            type: 'apartment',
            status: input.fullName ? 'occupied' : 'vacant',
            ...fields,
          },
          { client: trx }
        )
      } else if (unitChanges(unit, input).length) {
        unit.useTransaction(trx)
        unit.merge(fields)
        await unit.save()
      }

      if (input.fullName) {
        const person = snapshot.person(unit.id, input) as UnitOccupant | null
        const data = {
          fullName: input.fullName,
          ...(input.relationship ? { relationship: input.relationship } : {}),
          ...(input.documentType ? { documentType: input.documentType } : {}),
          ...(input.documentNumber ? { documentNumber: input.documentNumber } : {}),
          ...(input.phone ? { phone: input.phone } : {}),
          ...(input.email ? { email: input.email } : {}),
          ...(input.isPrimaryContact !== null ? { isPrimaryContact: input.isPrimaryContact } : {}),
          ...(input.isBillingResponsible !== null
            ? { isBillingResponsible: input.isBillingResponsible }
            : {}),
        }
        if (!person) {
          await UnitOccupant.create(
            {
              tenantId: this.tenant.id,
              unitId: unit.id,
              relationship: input.relationship!,
              isPrimaryContact: false,
              isBillingResponsible: false,
              ...data,
            },
            { client: trx }
          )
        } else if (personChanges(person, input).length) {
          person.useTransaction(trx)
          person.merge(data)
          await person.save()
        }
      }
      return unit.id
    })

    const snapshot = await Snapshot.load(this.tenant)
    return { row: planRow(snapshot, line, input, []), unitId }
  }
}
