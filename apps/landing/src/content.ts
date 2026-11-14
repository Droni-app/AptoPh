import type { Component } from 'vue'
import {
  Building2,
  CalendarCheck,
  Calculator,
  ClipboardList,
  DoorOpen,
  FileText,
  History,
  KeyRound,
  Layers,
  Megaphone,
  Monitor,
  Package,
  ShieldCheck,
  Smartphone,
  UserCog,
  Users,
  Wallet,
  Wrench,
} from '@lucide/vue'

/**
 * Single source for the landing copy. Components render it and the prerender
 * script turns `faqs` into FAQPage structured data, so both always match.
 */

export const site = {
  name: 'AptoPH',
  title: 'AptoPH | Software de administración de propiedad horizontal',
  description:
    'Administra tu conjunto residencial o edificio en una sola plataforma: cuotas de administración, pagos, zonas comunes, PQRS, portería y documentos.',
  tagline: 'La administración de tu conjunto, en orden.',
}

export interface NavLink {
  href: string
  label: string
}

export const nav: NavLink[] = [
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: '#perfiles', label: 'Para quién' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#demo', label: 'Demo' },
  { href: '#seguridad', label: 'Seguridad' },
  { href: '#preguntas', label: 'Preguntas' },
]

export interface Feature {
  id: string
  icon: Component
  title: string
  summary: string
  points: string[]
}

export const features: Feature[] = [
  {
    id: 'unidades',
    icon: Building2,
    title: 'Unidades y residentes',
    summary: 'El censo del conjunto siempre al día: torres, unidades y quién vive en cada una.',
    points: [
      'Torres, bloques o etapas con apartamentos, casas, locales, parqueaderos y depósitos',
      'Coeficiente de copropiedad y área privada por unidad',
      'Propietarios, arrendatarios y residentes con sus fechas de vinculación',
      'Registro de vehículos y mascotas por unidad',
    ],
  },
  {
    id: 'cartera',
    icon: Wallet,
    title: 'Cuotas de administración y cartera',
    summary: 'Genera los cobros del mes y conoce el estado de cuenta de cada unidad.',
    points: [
      'Conceptos de cobro: cuota ordinaria, extraordinaria, multas, intereses y servicios',
      'Cálculo por valor fijo, por coeficiente de copropiedad o por área',
      'Cargos por periodo con fecha de vencimiento',
      'Saldos pendientes, abonos parciales y cartera por unidad',
    ],
  },
  {
    id: 'pagos',
    icon: Calculator,
    title: 'Pagos y recaudo',
    summary: 'Registra los pagos y aplícalos a las deudas correctas, sin cuadres manuales.',
    points: [
      'El residente reporta su pago con el soporte adjunto',
      'La administración lo revisa y lo confirma o rechaza',
      'Un pago se puede repartir entre varios cargos',
      'Historial de pagos por unidad para contador y revisor fiscal',
    ],
  },
  {
    id: 'zonas-comunes',
    icon: CalendarCheck,
    title: 'Zonas comunes y reservas',
    summary: 'Salón social, BBQ o cancha: reservas en línea y sin cruces de horario.',
    points: [
      'Configura cada zona con su aforo, horarios, anticipación y límite por unidad',
      'Reservas en línea, con aprobación de la administración cuando la zona lo requiere',
      'El sistema impide que dos reservas se crucen',
      'Cobro de la reserva cargado al estado de cuenta de la unidad',
    ],
  },
  {
    id: 'comunicados',
    icon: Megaphone,
    title: 'Comunicados y circulares',
    summary: 'Publica avisos para todo el conjunto y sabe quién los leyó.',
    points: [
      'Circulares, avisos de mantenimiento y convocatorias',
      'Confirmación de lectura por residente',
      'Dirigidos a todos, solo propietarios, residentes, consejo o personal',
      'Borradores, publicación y comunicados fijados',
    ],
  },
  {
    id: 'pqrs',
    icon: Wrench,
    title: 'PQRS y mantenimiento',
    summary: 'Peticiones, quejas, reclamos, sugerencias y daños con seguimiento hasta el cierre.',
    points: [
      'Radicación desde la web o la app del residente',
      'Asignación al personal responsable',
      'Estados abierto, en proceso, resuelto y cerrado',
      'Conversación y trazabilidad de cada caso',
    ],
  },
  {
    id: 'porteria',
    icon: DoorOpen,
    title: 'Portería y visitantes',
    summary: 'Control de acceso digital: quién entra, a qué unidad y quién lo autorizó.',
    points: [
      'Registro de visitantes, domicilios y contratistas',
      'Preautorización de visitas por parte del residente',
      'Hora de ingreso y salida',
      'Historial consultable por la administración',
    ],
  },
  {
    id: 'paqueteria',
    icon: Package,
    title: 'Correspondencia y paquetes',
    summary: 'Cada paquete registrado en portería y entregado a quien corresponde.',
    points: [
      'Registro del paquete con foto al recibirlo',
      'El residente ve su correspondencia pendiente en la app',
      'Constancia de entrega o devolución',
      'Menos paquetes perdidos y menos llamadas a portería',
    ],
  },
  {
    id: 'documentos',
    icon: FileText,
    title: 'Documentos del conjunto',
    summary: 'Reglamento, actas y estados financieros disponibles para quien los necesita.',
    points: [
      'Reglamento de propiedad horizontal y manual de convivencia',
      'Actas de asamblea y del consejo',
      'Estados financieros, contratos y políticas',
      'Visibilidad por perfil: residentes, consejo o solo administración',
    ],
  },
]

export const upcoming = [
  {
    title: 'Asambleas virtuales',
    description:
      'Asistencia, poderes, quórum y votaciones ponderadas por coeficiente de copropiedad.',
  },
  {
    title: 'Notificaciones push',
    description: 'Avisos inmediatos en el celular para paquetes, visitas, pagos y comunicados.',
  },
  {
    title: 'Presupuesto y gastos',
    description: 'Presupuesto anual, proveedores y ejecución del gasto para el consejo.',
  },
]

export interface Profile {
  icon: Component
  role: string
  pitch: string
  can: string[]
}

export const profiles: Profile[] = [
  {
    icon: UserCog,
    role: 'Administración',
    pitch: 'Todo el conjunto en un panel, sin hojas de cálculo ni grupos de chat.',
    can: [
      'Gestiona unidades, residentes y personal',
      'Genera cobros y confirma pagos',
      'Aprueba reservas y atiende PQRS',
      'Publica comunicados y documentos',
    ],
  },
  {
    icon: Users,
    role: 'Consejo de administración',
    pitch: 'Información clara para decidir y hacer seguimiento a la gestión.',
    can: [
      'Consulta cartera, recaudo e indicadores',
      'Revisa el estado de las PQRS',
      'Accede a actas y estados financieros',
    ],
  },
  {
    icon: ClipboardList,
    role: 'Contador y revisor fiscal',
    pitch: 'Acceso de consulta a la información financiera que necesitan auditar.',
    can: [
      'Consulta cargos, pagos y su aplicación',
      'Revisa el historial con trazabilidad',
      'Descarga estados financieros y soportes',
    ],
  },
  {
    icon: KeyRound,
    role: 'Portería y personal',
    pitch: 'Herramientas simples para el día a día en la portería y el mantenimiento.',
    can: [
      'Registra visitantes y paquetes',
      'Consulta las visitas preautorizadas',
      'Atiende las solicitudes de mantenimiento asignadas',
    ],
  },
  {
    icon: Smartphone,
    role: 'Residentes',
    pitch: 'Propietarios y arrendatarios resuelven sus trámites desde el celular.',
    can: [
      'Consultan su estado de cuenta y reportan pagos',
      'Reservan zonas comunes',
      'Radican PQRS y autorizan visitas',
      'Reciben comunicados y avisos de paquetes',
    ],
  },
]

export const channels = [
  {
    icon: Monitor,
    title: 'Backoffice web',
    description:
      'Para administración, consejo, contador, revisor fiscal y portería. Funciona en cualquier navegador.',
  },
  {
    icon: Smartphone,
    title: 'App móvil',
    description: 'Para residentes y personal del conjunto, en Android y iOS.',
  },
  {
    icon: Layers,
    title: 'Portal web de residentes',
    description: 'La misma experiencia de la app, desde el computador.',
  },
]

export const steps = [
  {
    title: 'Configura tu conjunto',
    description:
      'Crea las torres y unidades con sus coeficientes, conceptos de cobro y zonas comunes.',
  },
  {
    title: 'Invita a tu equipo y residentes',
    description:
      'Cada persona entra con su propia cuenta y el perfil que le corresponde: administración, consejo, portería o residente.',
  },
  {
    title: 'Administra desde el primer día',
    description:
      'Cobros, pagos, reservas, PQRS y portería en una sola plataforma, con la información siempre al día.',
  },
]

export const security = [
  {
    icon: Layers,
    title: 'Datos aislados por conjunto',
    description:
      'La información de cada copropiedad está separada desde la base de datos. Nadie ve datos de otro conjunto.',
  },
  {
    icon: ShieldCheck,
    title: 'Permisos por perfil',
    description:
      'Cada persona ve y hace solo lo que su rol permite. Por ejemplo, el consejo consulta y la administración gestiona.',
  },
  {
    icon: KeyRound,
    title: 'Acceso seguro',
    description:
      'Inicio de sesión con el estándar OAuth 2.1 y PKCE, sesiones que expiran y credenciales que nunca se guardan en texto plano.',
  },
  {
    icon: History,
    title: 'Trazabilidad',
    description: 'Registro de auditoría de las acciones importantes: quién hizo qué y cuándo.',
  },
]

export interface Faq {
  question: string
  answer: string
}

export const faqs: Faq[] = [
  {
    question: '¿Qué es AptoPH?',
    answer:
      'AptoPH es un software en la nube para administrar conjuntos residenciales, edificios y copropiedades sometidas al régimen de propiedad horizontal. Reúne en una sola plataforma la cartera, los pagos, las zonas comunes, las PQRS, la portería, la correspondencia y los documentos del conjunto.',
  },
  {
    question: '¿Está pensado para la propiedad horizontal en Colombia?',
    answer:
      'Sí. Maneja los conceptos de la Ley 675 de 2001: unidades privadas con coeficiente de copropiedad, cuotas ordinarias y extraordinarias, consejo de administración, revisor fiscal, reglamento y actas.',
  },
  {
    question: '¿Sirve para conjuntos residenciales, edificios y centros comerciales?',
    answer:
      'Sí. Se adapta a copropiedades residenciales, comerciales o mixtas, con torres, bloques o etapas y con unidades de tipo apartamento, casa, local, parqueadero o depósito.',
  },
  {
    question: '¿Puedo administrar varios conjuntos con una sola cuenta?',
    answer:
      'Sí. Las empresas y personas que administran varias copropiedades entran con un mismo usuario y cambian de conjunto sin cerrar sesión. La información de cada conjunto permanece separada.',
  },
  {
    question: '¿Qué pueden hacer los residentes?',
    answer:
      'Propietarios y arrendatarios consultan su estado de cuenta, reportan pagos, reservan zonas comunes, radican PQRS, autorizan visitas, reciben comunicados y consultan los documentos del conjunto desde la app móvil o el portal web.',
  },
  {
    question: '¿Cómo se calculan las cuotas de administración?',
    answer:
      'Cada concepto de cobro se configura con un valor fijo, por coeficiente de copropiedad o por área de la unidad. AptoPH genera los cargos de cada periodo y lleva el saldo de cada unidad, incluidos los abonos parciales.',
  },
  {
    question: '¿Cómo protege AptoPH la información del conjunto?',
    answer:
      'Los datos de cada copropiedad están aislados, el acceso depende del perfil de cada persona, el inicio de sesión usa OAuth 2.1 con PKCE y las acciones importantes quedan registradas en una bitácora de auditoría.',
  },
  {
    question: '¿Cómo empiezo a usar AptoPH?',
    answer:
      'Solicita una demostración. Te mostramos la plataforma con los datos de tu conjunto y te acompañamos en la configuración inicial de torres, unidades, residentes y cobros.',
  },
]

/**
 * Public demo conjunto. The API resets it on every deploy
 * (apps/api/database/seeders/demo_seeder.ts): keep these values in sync.
 */
export const demo = {
  password: 'demo1234',
  conjunto: 'Altos del Parque (Demo)',
  accounts: [
    {
      id: 'admin',
      app: 'admin' as const,
      title: 'Administración',
      email: 'admin@demo.test',
      description:
        'Entra como la administradora del conjunto: indicadores, torres, unidades, ocupantes y personas.',
      cta: 'Abrir el panel de administración',
    },
    {
      id: 'residente',
      app: 'web' as const,
      title: 'Residente',
      email: 'residente@demo.test',
      description:
        'Entra como el propietario del apartamento 302 de la Torre 1: saldo, estado de cuenta, hogar, vehículos y mascotas.',
      cta: 'Abrir la app de residentes',
    },
  ],
}
