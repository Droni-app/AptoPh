import type { DocumentType, OccupantRelationship, UnitStatus, UnitType } from './domain.js'

/**
 * Bulk import of towers, units and people from a CSV (docs/import.md). One row
 * is one unit and, optionally, one person of that unit: a unit with an owner
 * and a renter takes two rows.
 */

export const IMPORT_MAX_ROWS = 3000
export const IMPORT_MAX_MB = 2

export type ImportField =
  | 'building'
  | 'code'
  | 'type'
  | 'floor'
  | 'privateArea'
  | 'coefficient'
  | 'status'
  | 'fullName'
  | 'relationship'
  | 'documentType'
  | 'documentNumber'
  | 'phone'
  | 'email'
  | 'isPrimaryContact'
  | 'isBillingResponsible'

export interface ImportColumn {
  field: ImportField
  /** Header in the example file */
  header: string
  /** Other headers accepted (compared without accents, case or symbols) */
  aliases: readonly string[]
  label: string
  required: boolean
  help: string
}

export const IMPORT_COLUMNS: readonly ImportColumn[] = [
  {
    field: 'building',
    header: 'torre',
    aliases: ['bloque', 'etapa', 'interior', 'edificio'],
    label: 'Torre',
    required: false,
    help: 'Nombre de la torre, bloque o etapa. Si no existe, se crea. Vacío si la unidad no está en una torre.',
  },
  {
    field: 'code',
    header: 'unidad',
    aliases: ['codigo', 'apartamento', 'apto', 'casa', 'numero'],
    label: 'Unidad',
    required: true,
    help: 'Código de la unidad, por ejemplo 101 o Casa 5. Con la torre identifica la unidad.',
  },
  {
    field: 'type',
    header: 'tipo',
    aliases: ['tipo_unidad', 'tipo_de_unidad'],
    label: 'Tipo',
    required: false,
    help: 'Apartamento, Casa, Local comercial, Parqueadero o Depósito. Si está vacío: Apartamento.',
  },
  {
    field: 'floor',
    header: 'piso',
    aliases: ['nivel'],
    label: 'Piso',
    required: false,
    help: 'Número entero.',
  },
  {
    field: 'privateArea',
    header: 'area_m2',
    aliases: ['area', 'area_privada', 'metros'],
    label: 'Área privada (m²)',
    required: false,
    help: 'Metros cuadrados; acepta coma o punto decimal.',
  },
  {
    field: 'coefficient',
    header: 'coeficiente',
    aliases: ['coeficiente_pct', 'coeficiente_de_copropiedad'],
    label: 'Coeficiente (%)',
    required: false,
    help: 'Coeficiente de copropiedad en porcentaje, por ejemplo 1,25 para 1,25 %.',
  },
  {
    field: 'status',
    header: 'estado',
    aliases: ['estado_unidad'],
    label: 'Estado',
    required: false,
    help: 'Ocupada, Desocupada o En construcción. Si está vacío en una unidad nueva: Ocupada si trae persona.',
  },
  {
    field: 'fullName',
    header: 'nombre',
    aliases: ['nombre_completo', 'nombres', 'persona', 'propietario'],
    label: 'Nombre',
    required: false,
    help: 'Nombre completo de la persona. Vacío para cargar solo la unidad.',
  },
  {
    field: 'relationship',
    header: 'relacion',
    aliases: ['calidad', 'vinculo', 'relacion_con_la_unidad'],
    label: 'Relación',
    required: false,
    help: 'Propietario, Arrendatario, Familiar, Empleado doméstico u Otro. Obligatoria si hay nombre.',
  },
  {
    field: 'documentType',
    header: 'tipo_documento',
    aliases: ['tipo_doc', 'tipo_de_documento'],
    label: 'Tipo de documento',
    required: false,
    help: 'CC, CE, NIT, PP o TI.',
  },
  {
    field: 'documentNumber',
    header: 'documento',
    aliases: ['numero_documento', 'cedula', 'identificacion', 'numero_de_documento'],
    label: 'Documento',
    required: false,
    help: 'Número de documento, sin puntos.',
  },
  {
    field: 'phone',
    header: 'telefono',
    aliases: ['celular', 'movil', 'telefono_celular'],
    label: 'Teléfono',
    required: false,
    help: 'Teléfono o celular.',
  },
  {
    field: 'email',
    header: 'correo',
    aliases: ['email', 'correo_electronico', 'e_mail'],
    label: 'Correo',
    required: false,
    help: 'Correo electrónico.',
  },
  {
    field: 'isPrimaryContact',
    header: 'contacto_principal',
    aliases: ['contacto'],
    label: 'Contacto principal',
    required: false,
    help: 'Sí o No.',
  },
  {
    field: 'isBillingResponsible',
    header: 'responsable_pago',
    aliases: ['responsable_de_pago', 'paga', 'responsable'],
    label: 'Responsable de pago',
    required: false,
    help: 'Sí o No: a quién se le cobra la administración.',
  },
]

/** Rows of the example file (fictitious people) */
export const IMPORT_EXAMPLE_ROWS: readonly (readonly string[])[] = [
  [
    'Torre 1',
    '101',
    'Apartamento',
    '1',
    '62,5',
    '1,25',
    'Ocupada',
    'María Gómez Ruiz',
    'Propietario',
    'CC',
    '52123456',
    '3001234567',
    'maria.gomez@ejemplo.com',
    'No',
    'No',
  ],
  [
    'Torre 1',
    '101',
    'Apartamento',
    '1',
    '62,5',
    '1,25',
    'Ocupada',
    'Juan Pérez Díaz',
    'Arrendatario',
    'CC',
    '80123456',
    '3109876543',
    'juan.perez@ejemplo.com',
    'Sí',
    'Sí',
  ],
  [
    'Torre 1',
    '102',
    'Apartamento',
    '1',
    '58',
    '1,15',
    'Desocupada',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ],
  [
    'Torre 2',
    '201',
    'Apartamento',
    '2',
    '62,5',
    '1,25',
    'Ocupada',
    'Laura Martínez',
    'Propietario',
    'CE',
    '1234567',
    '3204567890',
    'laura@ejemplo.com',
    'Sí',
    'Sí',
  ],
  [
    '',
    'Local 1',
    'Local comercial',
    '',
    '35',
    '0,8',
    'Ocupada',
    'Ferretería El Tornillo S.A.S.',
    'Propietario',
    'NIT',
    '900123456',
    '6015551234',
    'contacto@ejemplo.com',
    'Sí',
    'Sí',
  ],
]

/** The example file: semicolon separated (what Excel uses in Colombia), with BOM */
export function importExampleCsv() {
  const quote = (value: string) => (/[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
  const lines = [IMPORT_COLUMNS.map((column) => column.header), ...IMPORT_EXAMPLE_ROWS]
  return `﻿${lines.map((line) => line.map(quote).join(';')).join('\r\n')}\r\n`
}

/** A row of the file, read and normalized. null = empty cell (keep what exists) */
export interface ImportRowInput {
  building: string | null
  code: string
  type: UnitType | null
  floor: number | null
  privateArea: number | null
  /** Percentage, e.g. 1.25 */
  coefficient: number | null
  status: UnitStatus | null
  fullName: string | null
  relationship: OccupantRelationship | null
  documentType: DocumentType | null
  documentNumber: string | null
  phone: string | null
  email: string | null
  isPrimaryContact: boolean | null
  isBillingResponsible: boolean | null
}

export interface ImportIssue {
  field: ImportField | null
  message: string
}

export interface ImportChange {
  field: ImportField
  label: string
  from: string | null
  to: string | null
}

export type ImportAction = 'create' | 'update' | 'unchanged' | 'none'

export interface ImportPlanRow {
  /** Line of the file (the header is line 1) */
  line: number
  input: ImportRowInput | null
  errors: ImportIssue[]
  warnings: string[]
  /** create when any part is new, update when something changes, unchanged otherwise */
  status: 'create' | 'update' | 'unchanged' | 'error'
  building: { action: 'create' | 'unchanged' | 'none'; name: string | null }
  unit: { action: ImportAction; id: string | null; changes: ImportChange[] }
  person: { action: ImportAction; id: string | null; changes: ImportChange[] }
}

export interface ImportPreview {
  /** Separator detected in the file */
  delimiter: string
  rows: ImportPlanRow[]
}

export interface ImportRowResult {
  row: ImportPlanRow
  unitId: string
}
