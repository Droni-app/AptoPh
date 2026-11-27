import type { AccountClass, ChargeConceptType } from '@aptoph/shared'

/**
 * Simplified PUC (Decreto 2650 de 1993, as most copropiedades still use it)
 * for horizontal property. Levels: class (1 digit), group (2), account (4),
 * subaccount (6). Only subaccounts receive postings; bank and cash accounts get
 * their own auxiliary (8 digits) under 110505 / 111005 / 112005.
 *
 * `key` marks the accounts the system posts to automatically. Accountants can
 * rename them or add subaccounts, but the keys stay.
 */
export type ChartAccount = {
  code: string
  name: string
  key?: string
  /** Contra accounts (depreciation, discounts) have the opposite nature */
  nature?: 'debit' | 'credit'
  /** Parent of auxiliaries created by the system: not postable */
  group?: true
}

export const CHART_TEMPLATE: ChartAccount[] = [
  { code: '1', name: 'Activo' },
  { code: '11', name: 'Disponible' },
  { code: '1105', name: 'Caja' },
  { code: '110505', name: 'Caja general', group: true },
  { code: '1110', name: 'Bancos' },
  { code: '111005', name: 'Cuentas corrientes', group: true },
  { code: '1120', name: 'Cuentas de ahorro' },
  { code: '112005', name: 'Bancos (ahorros)', group: true },
  { code: '12', name: 'Inversiones' },
  { code: '1225', name: 'Certificados' },
  { code: '122505', name: 'Certificados de depósito a término (CDT)' },
  { code: '13', name: 'Deudores' },
  { code: '1305', name: 'Cuotas y cobros a copropietarios' },
  { code: '130505', name: 'Cuotas de administración', key: 'receivable.ordinary_fee' },
  { code: '130510', name: 'Cuotas extraordinarias', key: 'receivable.extraordinary_fee' },
  { code: '130515', name: 'Intereses de mora', key: 'receivable.interest' },
  { code: '130520', name: 'Multas y sanciones', key: 'receivable.fine' },
  { code: '130525', name: 'Parqueaderos', key: 'receivable.parking' },
  { code: '130530', name: 'Zonas comunes', key: 'receivable.amenity' },
  { code: '130595', name: 'Otros cobros a copropietarios', key: 'receivable.other' },
  { code: '1330', name: 'Anticipos y avances' },
  { code: '133005', name: 'Anticipos a proveedores' },
  { code: '1355', name: 'Anticipo de impuestos' },
  { code: '135515', name: 'Retención en la fuente' },
  { code: '1380', name: 'Deudores varios' },
  { code: '138095', name: 'Otros deudores' },
  { code: '15', name: 'Propiedades, planta y equipo' },
  { code: '1524', name: 'Equipo de oficina' },
  { code: '152405', name: 'Muebles y enseres' },
  { code: '1528', name: 'Equipo de computación y comunicación' },
  { code: '152805', name: 'Equipos de procesamiento de datos' },
  { code: '1592', name: 'Depreciación acumulada', nature: 'credit' },
  { code: '159215', name: 'Depreciación equipo de oficina', nature: 'credit' },
  { code: '17', name: 'Diferidos' },
  { code: '1705', name: 'Gastos pagados por anticipado' },
  { code: '170520', name: 'Seguros y fianzas' },

  { code: '2', name: 'Pasivo' },
  { code: '22', name: 'Proveedores' },
  { code: '2205', name: 'Nacionales' },
  { code: '220505', name: 'Proveedores y acreedores', key: 'payables.vendors' },
  { code: '23', name: 'Cuentas por pagar' },
  { code: '2335', name: 'Costos y gastos por pagar' },
  { code: '233525', name: 'Honorarios' },
  { code: '233550', name: 'Servicios públicos' },
  { code: '233595', name: 'Otros costos y gastos por pagar' },
  { code: '2365', name: 'Retención en la fuente' },
  { code: '236595', name: 'Retención en la fuente por pagar', key: 'withholding.income_tax' },
  { code: '2367', name: 'Impuesto a las ventas retenido' },
  { code: '236705', name: 'IVA retenido', key: 'withholding.vat' },
  { code: '2368', name: 'Impuesto de industria y comercio retenido' },
  { code: '236805', name: 'ICA retenido', key: 'withholding.ica' },
  { code: '2370', name: 'Retenciones y aportes de nómina' },
  { code: '237095', name: 'Aportes de nómina por pagar' },
  { code: '24', name: 'Impuestos, gravámenes y tasas' },
  { code: '2408', name: 'Impuesto sobre las ventas por pagar' },
  { code: '240805', name: 'IVA generado por pagar', key: 'tax.vat_payable' },
  { code: '25', name: 'Obligaciones laborales' },
  { code: '2505', name: 'Salarios por pagar' },
  { code: '250505', name: 'Salarios por pagar' },
  { code: '2510', name: 'Cesantías consolidadas' },
  { code: '251010', name: 'Cesantías' },
  { code: '2515', name: 'Intereses sobre cesantías' },
  { code: '251505', name: 'Intereses sobre cesantías' },
  { code: '2525', name: 'Vacaciones consolidadas' },
  { code: '252505', name: 'Vacaciones' },
  { code: '28', name: 'Otros pasivos' },
  { code: '2805', name: 'Anticipos y avances recibidos' },
  { code: '280505', name: 'Anticipos de copropietarios (saldos a favor)', key: 'advances.units' },
  { code: '2815', name: 'Ingresos recibidos para terceros' },
  { code: '281505', name: 'Depósitos recibidos', key: 'deposits.received' },

  { code: '3', name: 'Patrimonio' },
  { code: '33', name: 'Reservas' },
  { code: '3305', name: 'Reservas obligatorias' },
  { code: '330595', name: 'Fondo de imprevistos (art. 35 Ley 675)', key: 'equity.reserve_fund' },
  { code: '36', name: 'Resultados del ejercicio' },
  { code: '3605', name: 'Excedente del ejercicio' },
  { code: '360505', name: 'Excedente del ejercicio' },
  { code: '3610', name: 'Déficit del ejercicio' },
  { code: '361005', name: 'Déficit del ejercicio' },
  { code: '37', name: 'Resultados de ejercicios anteriores' },
  { code: '3705', name: 'Excedentes acumulados' },
  { code: '370505', name: 'Excedentes acumulados', key: 'equity.opening' },
  { code: '3710', name: 'Déficit acumulado' },
  { code: '371005', name: 'Déficit acumulado' },

  { code: '4', name: 'Ingresos' },
  { code: '41', name: 'Operacionales' },
  { code: '4170', name: 'Ingresos de la copropiedad' },
  { code: '417005', name: 'Cuotas de administración', key: 'income.ordinary_fee' },
  { code: '417010', name: 'Cuotas extraordinarias', key: 'income.extraordinary_fee' },
  { code: '417015', name: 'Parqueaderos', key: 'income.parking' },
  { code: '417020', name: 'Parqueadero de visitantes', key: 'income.visitor_parking' },
  { code: '417025', name: 'Alquiler de zonas comunes', key: 'income.amenity_booking' },
  { code: '417095', name: 'Otros ingresos de la copropiedad', key: 'income.other' },
  { code: '4175', name: 'Devoluciones y descuentos (DB)', nature: 'debit' },
  {
    code: '417505',
    name: 'Descuentos por pronto pago',
    key: 'discounts.early_payment',
    nature: 'debit',
  },
  { code: '42', name: 'No operacionales' },
  { code: '4210', name: 'Financieros' },
  { code: '421005', name: 'Intereses de mora', key: 'income.interest' },
  { code: '421010', name: 'Rendimientos financieros' },
  { code: '4250', name: 'Recuperaciones' },
  { code: '425050', name: 'Reintegro de otros costos y gastos' },
  { code: '4295', name: 'Diversos' },
  { code: '429553', name: 'Multas y sanciones', key: 'income.fine' },
  { code: '429581', name: 'Ajuste al peso' },
  { code: '429595', name: 'Otros ingresos diversos' },

  { code: '5', name: 'Gastos' },
  { code: '51', name: 'Operacionales de administración' },
  { code: '5105', name: 'Gastos de personal' },
  { code: '510506', name: 'Sueldos' },
  { code: '510515', name: 'Horas extras y recargos' },
  { code: '510527', name: 'Auxilio de transporte' },
  { code: '510530', name: 'Cesantías' },
  { code: '510533', name: 'Intereses sobre cesantías' },
  { code: '510536', name: 'Prima de servicios' },
  { code: '510539', name: 'Vacaciones' },
  { code: '510568', name: 'Aportes a riesgos laborales (ARL)' },
  { code: '510569', name: 'Aportes a salud (EPS)' },
  { code: '510570', name: 'Aportes a pensiones' },
  { code: '510572', name: 'Aportes a caja de compensación' },
  { code: '5110', name: 'Honorarios' },
  { code: '511010', name: 'Revisoría fiscal' },
  { code: '511025', name: 'Asesoría jurídica' },
  { code: '511030', name: 'Asesoría contable' },
  { code: '511095', name: 'Administración de la copropiedad' },
  { code: '5115', name: 'Impuestos' },
  { code: '511595', name: 'Otros impuestos' },
  { code: '5125', name: 'Contribuciones y afiliaciones' },
  { code: '512505', name: 'Contribuciones y afiliaciones' },
  { code: '5130', name: 'Seguros' },
  { code: '513005', name: 'Póliza de áreas comunes' },
  { code: '513095', name: 'Otros seguros' },
  { code: '5135', name: 'Servicios' },
  { code: '513505', name: 'Aseo y vigilancia' },
  { code: '513525', name: 'Acueducto y alcantarillado' },
  { code: '513530', name: 'Energía eléctrica' },
  { code: '513535', name: 'Teléfono e internet' },
  { code: '513555', name: 'Gas' },
  { code: '513595', name: 'Otros servicios' },
  { code: '5140', name: 'Gastos legales' },
  { code: '514005', name: 'Notariales' },
  { code: '514095', name: 'Otros gastos legales' },
  { code: '5145', name: 'Mantenimiento y reparaciones' },
  { code: '514510', name: 'Construcciones y edificaciones' },
  { code: '514515', name: 'Ascensores, equipos y maquinaria' },
  { code: '514540', name: 'Zonas verdes y jardinería' },
  { code: '514595', name: 'Otros mantenimientos' },
  { code: '5160', name: 'Depreciaciones' },
  { code: '516015', name: 'Depreciación equipo de oficina' },
  { code: '5195', name: 'Diversos' },
  { code: '519525', name: 'Elementos de aseo y cafetería' },
  { code: '519530', name: 'Útiles, papelería y fotocopias' },
  { code: '519545', name: 'Gastos de asamblea' },
  { code: '519595', name: 'Otros gastos diversos' },
  { code: '53', name: 'No operacionales' },
  { code: '5305', name: 'Financieros' },
  { code: '530505', name: 'Gastos bancarios' },
  { code: '530515', name: 'Comisiones' },
  { code: '530520', name: 'Intereses' },
  { code: '530595', name: 'Gravamen a los movimientos financieros (4 x 1.000)' },
  { code: '5395', name: 'Gastos diversos' },
  { code: '539595', name: 'Apropiación fondo de imprevistos', key: 'expense.reserve_fund' },
]

const CLASS_BY_DIGIT: Record<string, AccountClass> = {
  '1': 'asset',
  '2': 'liability',
  '3': 'equity',
  '4': 'income',
  '5': 'expense',
  '6': 'expense',
  '7': 'expense',
}

export function accountClass(code: string): AccountClass {
  const found = CLASS_BY_DIGIT[code[0]!]
  if (!found) throw new Error(`Invalid account code ${code}`)
  return found
}

export function defaultNature(code: string): 'debit' | 'credit' {
  return ['asset', 'expense'].includes(accountClass(code)) ? 'debit' : 'credit'
}

/** Subaccounts (6 digits) and auxiliaries (8+) receive postings */
export function isLeafCode(code: string) {
  return code.length >= 6
}

/** Parent account of a code: 110505 → 1105, 11050501 → 110505, 1105 → 11, 11 → 1 */
export function parentCode(code: string) {
  if (code.length <= 1) return null
  if (code.length === 2) return code.slice(0, 1)
  if (code.length === 4) return code.slice(0, 2)
  if (code.length === 6) return code.slice(0, 4)
  return code.slice(0, code.length - 2)
}

/**
 * Concepts every conjunto gets, with the accounts their charges post to.
 * Custom concepts take the accounts of their type (see `accountKeysFor`).
 */
export type DefaultConcept = {
  code: string
  name: string
  type: ChargeConceptType
  accruesInterest: boolean
  allowsEarlyDiscount: boolean
}

export const DEFAULT_CONCEPTS: DefaultConcept[] = [
  {
    code: 'ordinary_fee',
    name: 'Cuota de administración',
    type: 'ordinary_fee',
    accruesInterest: true,
    allowsEarlyDiscount: true,
  },
  {
    code: 'extraordinary_fee',
    name: 'Cuota extraordinaria',
    type: 'extraordinary_fee',
    accruesInterest: true,
    allowsEarlyDiscount: false,
  },
  {
    code: 'interest',
    name: 'Intereses de mora',
    type: 'interest',
    accruesInterest: false,
    allowsEarlyDiscount: false,
  },
  {
    code: 'fine',
    name: 'Multas y sanciones',
    type: 'fine',
    accruesInterest: false,
    allowsEarlyDiscount: false,
  },
  {
    code: 'parking',
    name: 'Parqueadero',
    type: 'parking',
    accruesInterest: false,
    allowsEarlyDiscount: false,
  },
  {
    code: 'visitor_parking',
    name: 'Parqueadero de visitantes',
    type: 'visitor_parking',
    accruesInterest: false,
    allowsEarlyDiscount: false,
  },
  {
    code: 'amenity_booking',
    name: 'Reserva de zonas comunes',
    type: 'amenity_booking',
    accruesInterest: false,
    allowsEarlyDiscount: false,
  },
  {
    code: 'opening_balance',
    name: 'Saldo inicial de cartera',
    type: 'opening_balance',
    accruesInterest: false,
    allowsEarlyDiscount: false,
  },
  {
    code: 'other',
    name: 'Otros cobros',
    type: 'other',
    accruesInterest: false,
    allowsEarlyDiscount: false,
  },
]

/** Default receivable and income accounts of each concept type */
export function accountKeysFor(type: ChargeConceptType): { receivable: string; income: string } {
  switch (type) {
    case 'ordinary_fee':
      return { receivable: 'receivable.ordinary_fee', income: 'income.ordinary_fee' }
    case 'extraordinary_fee':
      return { receivable: 'receivable.extraordinary_fee', income: 'income.extraordinary_fee' }
    case 'interest':
      return { receivable: 'receivable.interest', income: 'income.interest' }
    case 'fine':
      return { receivable: 'receivable.fine', income: 'income.fine' }
    case 'parking':
      return { receivable: 'receivable.parking', income: 'income.parking' }
    case 'visitor_parking':
      return { receivable: 'receivable.parking', income: 'income.visitor_parking' }
    case 'amenity_booking':
      return { receivable: 'receivable.amenity', income: 'income.amenity_booking' }
    // Debts from before AptoPH: they were income of past years
    case 'opening_balance':
      return { receivable: 'receivable.other', income: 'equity.opening' }
    default:
      return { receivable: 'receivable.other', income: 'income.other' }
  }
}

/**
 * Accounts a vendor bill can be charged to: expenses (5…) and the assets bought
 * from vendors: property and equipment (15…), intangibles (16…) and prepaid (17…).
 * Never cash, banks or receivables.
 */
export function isBillableAccount(account: { code: string; class: string }) {
  if (account.class === 'expense') return true
  return (
    account.class === 'asset' &&
    ['15', '16', '17'].some((prefix) => account.code.startsWith(prefix))
  )
}
