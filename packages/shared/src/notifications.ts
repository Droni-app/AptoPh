/**
 * Notifications (docs/notifications.md): every event lands in the bell of
 * the app (in-app, always) and, depending on the person's preferences, by
 * email and push to the mobile app. Account security emails (password,
 * verification) are not notifications: they always go out.
 */

export const NOTIFICATION_CATEGORIES = [
  "gatehouse",
  "finance",
  "announcements",
  "tickets",
  "bookings",
  "parking",
  "documents",
  "surveys",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  gatehouse: "Portería",
  finance: "Pagos y cartera",
  announcements: "Comunicados",
  tickets: "PQRS",
  bookings: "Reservas",
  parking: "Parqueaderos",
  documents: "Documentos",
  surveys: "Encuestas",
};

export const NOTIFICATION_CATEGORY_DESCRIPTIONS: Record<NotificationCategory, string> = {
  gatehouse: "Llegada de visitas y paquetes en portería",
  finance: "Cuotas generadas, pagos confirmados o rechazados y recordatorios de vencimiento",
  announcements: "Comunicados nuevos de la administración",
  tickets: "Respuestas y cambios de estado de las PQRS",
  bookings: "Reservas de zonas comunes",
  parking: "Sorteo de parqueaderos, cupos ofrecidos y cambios de asignación",
  documents: "Documentos nuevos del conjunto y vencimientos de contratos y pólizas",
  surveys: "Encuestas nuevas y recordatorio antes del cierre",
};

export const NOTIFICATION_CATEGORY_ICONS: Record<NotificationCategory, string> = {
  gatehouse: "mdi-account-clock-outline",
  finance: "mdi-cash-multiple",
  announcements: "mdi-bullhorn-outline",
  tickets: "mdi-message-text-outline",
  bookings: "mdi-calendar-check-outline",
  parking: "mdi-parking",
  documents: "mdi-folder-file-outline",
  surveys: "mdi-vote-outline",
};

export const NOTIFICATION_CHANNELS = ["email", "push"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export type NotificationPreferences = Record<
  NotificationCategory,
  Record<NotificationChannel, boolean>
>;

/** Defaults: everything on except the gate by email (it is immediate) and comunicados by push */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  gatehouse: { email: false, push: true },
  finance: { email: true, push: true },
  announcements: { email: true, push: false },
  tickets: { email: true, push: true },
  bookings: { email: true, push: true },
  parking: { email: true, push: true },
  documents: { email: true, push: false },
  surveys: { email: true, push: true },
};

/** Stored preferences (maybe partial or from an older version) over the defaults */
export function notificationPreferences(stored: unknown): NotificationPreferences {
  const value = (stored ?? {}) as Partial<Record<string, Partial<Record<string, unknown>>>>;
  const result = {} as NotificationPreferences;
  for (const category of NOTIFICATION_CATEGORIES) {
    const defaults = DEFAULT_NOTIFICATION_PREFERENCES[category];
    const row = value[category] ?? {};
    result[category] = {
      email: typeof row.email === "boolean" ? row.email : defaults.email,
      push: typeof row.push === "boolean" ? row.push : defaults.push,
    };
  }
  return result;
}

/** Where the notification opens: the resident portal or the back-office */
export const NOTIFICATION_APPS = ["web", "backoffice"] as const;
export type NotificationApp = (typeof NOTIFICATION_APPS)[number];

export type AppNotification = {
  id: string;
  category: NotificationCategory;
  /** Event, e.g. `ticket.reply`, `payment.confirmed` */
  type: string;
  title: string;
  body: string | null;
  /** Path inside the app, e.g. `/pqrs/123` */
  path: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationList = {
  data: AppNotification[];
  unread: number;
};

export const PUSH_PLATFORMS = ["android", "ios", "web"] as const;
export type PushPlatform = (typeof PUSH_PLATFORMS)[number];

export type PushDeviceInput = {
  token: string;
  platform: PushPlatform;
  deviceName?: string | null;
  appVersion?: string | null;
};
