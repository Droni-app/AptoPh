import ExcelJS from 'exceljs'
import { DateTime } from 'luxon'
import type { ReportCell, ReportColumn, ReportColumnType, ReportResult } from '@aptoph/shared'
import type Tenant from '#models/tenants/tenant'

/** Columns that are data, not hidden keys (`_unitId`) */
const visibleRows = (result: ReportResult) => result.rows

const BRAND = 'FF0F766E'

function wallTime(iso: string, zone: string) {
  const local = DateTime.fromISO(iso).setZone(zone)
  return new Date(Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute))
}

function calendarDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, day!))
}

/** A cell for Excel: real numbers and dates so the accountant can sum and filter */
function excelValue(type: ReportColumnType, value: ReportCell, zone: string) {
  if (value === null || value === '') return null
  if (typeof value === 'string' && (type === 'text' || Number.isNaN(Number(value)))) {
    if (type === 'date' || type === 'month')
      return /^\d{4}-\d{2}-\d{2}/.test(value) ? calendarDate(value) : value
    if (type === 'datetime') return DateTime.fromISO(value).isValid ? wallTime(value, zone) : value
    return value
  }
  switch (type) {
    case 'money':
    case 'number':
    case 'hours':
      return Number(value)
    case 'percent':
      return Number(value) / 100
    case 'date':
    case 'month':
      return calendarDate(String(value))
    case 'datetime':
      return wallTime(String(value), zone)
    default:
      return value
  }
}

function numberFormat(type: ReportColumnType, value: unknown) {
  switch (type) {
    case 'money':
      return '"$"#,##0.00;[Red]-"$"#,##0.00'
    case 'percent':
      return '0.0%'
    case 'hours':
      return '#,##0.0'
    case 'number':
      return typeof value === 'number' && !Number.isInteger(value) ? 'General' : '#,##0'
    case 'date':
      return 'dd/mm/yyyy'
    case 'month':
      return 'mmm yyyy'
    case 'datetime':
      return 'dd/mm/yyyy hh:mm'
    default:
      return undefined
  }
}

const width = (column: ReportColumn) =>
  ({ money: 16, number: 12, percent: 11, hours: 12, date: 12, month: 12, datetime: 17, text: 28 })[
    column.type
  ]

export async function reportToXlsx(result: ReportResult, tenant: Tenant) {
  const zone = tenant.timezone || 'America/Bogota'
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'AptoPH'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet(result.title.slice(0, 31).replace(/[\\/?*[\]:]/g, ' '), {
    views: [{ state: 'frozen', ySplit: 0 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  const span = Math.max(result.columns.length, 2)

  const line = (text: string, options: { bold?: boolean; size?: number; color?: string } = {}) => {
    const row = sheet.addRow([text])
    sheet.mergeCells(row.number, 1, row.number, span)
    row.getCell(1).font = {
      bold: options.bold,
      size: options.size ?? 10,
      color: { argb: options.color ?? 'FF404040' },
    }
    return row
  }
  line(tenant.name, { bold: true, size: 12, color: BRAND })
  line(result.title, { bold: true, size: 14, color: 'FF111111' })
  if (result.period) line(result.period)
  for (const filter of result.filters) line(`${filter.label}: ${filter.value}`)
  line(
    `Generado el ${DateTime.fromISO(result.generatedAt).setZone(zone).toFormat('dd/MM/yyyy HH:mm')} desde AptoPH`,
    { color: 'FF808080' }
  )

  if (result.summary.length) {
    sheet.addRow([])
    for (const metric of result.summary) {
      const row = sheet.addRow([metric.label, excelValue(metric.type, metric.value, zone)])
      row.getCell(1).font = { size: 10, color: { argb: 'FF606060' } }
      const cell = row.getCell(2)
      cell.font = { bold: true }
      const format = numberFormat(metric.type, metric.value)
      if (format) cell.numFmt = format
      cell.alignment = { horizontal: 'left' }
    }
  }

  sheet.addRow([])
  const header = sheet.addRow(result.columns.map((column) => column.label))
  const headerRow = header.number
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
    cell.alignment = { vertical: 'middle', wrapText: true }
  })
  header.height = 30

  const write = (values: Record<string, ReportCell>, bold = false) => {
    const row = sheet.addRow(
      result.columns.map((column) => excelValue(column.type, values[column.key] ?? null, zone))
    )
    result.columns.forEach((column, index) => {
      const cell = row.getCell(index + 1)
      const format = numberFormat(column.type, cell.value)
      if (format && cell.value !== null) cell.numFmt = format
      if (bold) cell.font = { bold: true }
    })
    return row
  }
  for (const values of visibleRows(result)) write(values)
  if (result.totals) {
    const totals = write(result.totals, true)
    totals.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: 'FF808080' } } }
    })
  }

  if (result.truncated || result.notes.length) sheet.addRow([])
  if (result.truncated)
    line('El reporte tiene más filas de las que se exportan: acota los filtros.', {
      color: 'FFB91C1C',
    })
  for (const note of result.notes) line(note, { color: 'FF606060' })

  result.columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = width(column)
  })
  sheet.views = [{ state: 'frozen', ySplit: headerRow }]
  sheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: headerRow, column: result.columns.length },
  }
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

/** CSV for Excel in Colombia: semicolons, decimal comma, UTF-8 with BOM */
export function reportToCsv(result: ReportResult, tenant: Tenant) {
  const zone = tenant.timezone || 'America/Bogota'
  const text = (type: ReportColumnType, value: ReportCell) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string' && type === 'text') return value
    switch (type) {
      case 'money':
      case 'number':
      case 'percent':
      case 'hours':
        return String(value).replace('.', ',')
      case 'datetime':
        return DateTime.fromISO(String(value)).setZone(zone).toFormat('yyyy-MM-dd HH:mm')
      case 'month':
        return String(value).slice(0, 7)
      default:
        return String(value)
    }
  }
  const escape = (value: string) =>
    /[";\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
  const lines = [
    result.columns.map((column) => escape(column.label)).join(';'),
    ...[...visibleRows(result), ...(result.totals ? [result.totals] : [])].map((row) =>
      result.columns.map((column) => escape(text(column.type, row[column.key] ?? null))).join(';')
    ),
  ]
  return Buffer.from(`\uFEFF${lines.join('\r\n')}\r\n`, 'utf8')
}
