/** Navigation of the back-office: the sidebar groups and the finance sub-sections */

export interface NavLink {
  label: string
  icon: string
  to: { name: string }
  /** Route names that mark the link as current */
  match: string[]
}

export interface NavEntry extends NavLink {
  children?: NavLink[]
}

export interface NavGroup {
  label: string
  items: NavEntry[]
}

const link = (label: string, icon: string, name: string, match: string[] = [name]): NavLink => ({
  label,
  icon,
  to: { name },
  match,
})

export function financeLinks(canManage: boolean): NavLink[] {
  return [
    link('Resumen', 'mdi-chart-box-outline', 'finance'),
    link('Facturación', 'mdi-file-document-multiple-outline', 'finance-billing'),
    link('Tarifas', 'mdi-calculator-variant-outline', 'finance-fees'),
    link('Recaudo', 'mdi-cash-check', 'finance-payments'),
    link('Cartera', 'mdi-account-cash-outline', 'finance-receivables', [
      'finance-receivables',
      'finance-statement',
    ]),
    link('Gastos', 'mdi-receipt-text-outline', 'finance-expenses'),
    link('Bancos', 'mdi-bank-outline', 'finance-banks', [
      'finance-banks',
      'finance-reconciliation',
      'finance-reconciliation-statement',
    ]),
    link('Presupuesto', 'mdi-chart-donut', 'finance-budgets', [
      'finance-budgets',
      'finance-budget',
    ]),
    link('Contabilidad', 'mdi-book-open-variant', 'finance-accounting'),
    link('Informes', 'mdi-file-chart-outline', 'finance-reports'),
    ...(canManage ? [link('Configuración', 'mdi-cog-outline', 'finance-settings')] : []),
  ]
}

export function navigation(options: {
  canReadFinance: boolean
  canManageFinance: boolean
  /** Administration: imports */
  canManage: boolean
  /** PQRS: administration, council and staff */
  canReadTickets: boolean
  /** Visitor parking: administration and guards */
  canUseVisitorParking: boolean
  /** Parking of the conjunto: administration, council and guards */
  canReadParking: boolean
  /** Common areas: calendar and bookings */
  canReadAmenities: boolean
  /** Surveys: administration, council and fiscal reviewer */
  canReadSurveys: boolean
  /** Reports: administration, accounting, council and fiscal reviewer */
  canReadReports: boolean
  /** Audit log */
  canReadAudit: boolean
  hasSubscription: boolean
}): NavGroup[] {
  const finance = financeLinks(options.canManageFinance)
  const groups: NavGroup[] = [
    {
      label: 'Conjunto',
      items: [
        link('Inicio', 'mdi-view-dashboard-outline', 'dashboard'),
        link('Unidades', 'mdi-door', 'units', ['units', 'unit']),
        link('Torres', 'mdi-office-building-outline', 'buildings'),
        ...(options.canReadParking
          ? [link('Parqueaderos', 'mdi-parking', 'parking', ['parking', 'parking-settings'])]
          : []),
        link('Personas', 'mdi-account-group-outline', 'members'),
      ],
    },
    {
      label: 'Comunicación',
      items: [
        link('Comunicados', 'mdi-bullhorn-outline', 'announcements'),
        link('Documentos', 'mdi-folder-file-outline', 'documents'),
        ...(options.canReadSurveys
          ? [link('Encuestas', 'mdi-vote-outline', 'surveys', ['surveys', 'survey'])]
          : []),
        ...(options.canReadTickets ? [link('PQRS', 'mdi-message-alert-outline', 'tickets')] : []),
        ...(options.canReadAmenities
          ? [
              link('Zonas comunes', 'mdi-calendar-star', 'amenities', [
                'amenities',
                'amenities-settings',
              ]),
            ]
          : []),
      ],
    },
  ]
  if (options.canUseVisitorParking)
    groups.push({
      label: 'Portería',
      items: [
        link('Parqueadero de visitantes', 'mdi-car-clock', 'visitor-parking', [
          'visitor-parking',
          'visitor-parking-settings',
        ]),
      ],
    })
  if (options.canReadFinance)
    groups.push({
      label: 'Finanzas',
      items: [
        {
          ...link(
            'Finanzas',
            'mdi-cash-multiple',
            'finance',
            finance.flatMap((item) => item.match),
          ),
          children: finance,
        },
      ],
    })
  if (options.canReadReports || options.canReadAudit)
    groups.push({
      label: 'Control',
      items: [
        ...(options.canReadReports
          ? [link('Reportes', 'mdi-chart-box-multiple-outline', 'reports', ['reports', 'report'])]
          : []),
        ...(options.canReadAudit ? [link('Auditoría', 'mdi-shield-search', 'audit')] : []),
      ],
    })
  groups.push({
    label: 'Administración',
    items: [
      link('Configuración', 'mdi-cog-outline', 'settings'),
      ...(options.canManage ? [link('Importar', 'mdi-database-import-outline', 'import')] : []),
      // Managed conjuntos (no subscription) have no plan page
      ...(options.hasSubscription
        ? [link('Plan', 'mdi-card-account-details-star-outline', 'plan')]
        : []),
    ],
  })
  return groups
}

/** Name of the current section, for the top bar */
export function currentTrail(groups: NavGroup[], routeName: string): string[] {
  for (const group of groups)
    for (const item of group.items) {
      const child = item.children?.find((c) => c.match.includes(routeName))
      if (child) return child.to.name === item.to.name ? [item.label] : [item.label, child.label]
      if (item.match.includes(routeName)) return [item.label]
    }
  return []
}
