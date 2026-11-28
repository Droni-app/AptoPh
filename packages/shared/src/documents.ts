import type { EnrollmentRole } from "./index.js";
import type { UnitRef } from "./api.js";
import { ATTACHMENT_EXTENSIONS, type Attachment } from "./files.js";

/**
 * Documentos del conjunto (docs/documents.md): actas, reglamentos, estados
 * financieros, contratos, cotizaciones, pólizas, títulos… con control de
 * quién puede ver cada uno.
 */

/** Quién sube, edita, publica y archiva documentos */
export const DOCUMENT_MANAGE_ROLES: readonly EnrollmentRole[] = ["administrator"];

/** Tamaño máximo de un archivo de documento (actas escaneadas, planos) */
export const DOCUMENT_MAX_MB = 25;

/** Formatos de documento: los de los adjuntos más presentaciones, OpenDocument, texto y planos */
export const DOCUMENT_EXTENSIONS = [
  ...ATTACHMENT_EXTENSIONS,
  "ppt",
  "pptx",
  "odt",
  "ods",
  "txt",
  "dwg",
] as const;
export const DOCUMENT_ACCEPT = DOCUMENT_EXTENSIONS.map((ext) => `.${ext}`).join(",");

/** Versiones guardadas de un mismo documento */
export const DOCUMENT_MAX_VERSIONS = 30;

/** Días antes del vencimiento en que se avisa a la administración */
export const DOCUMENT_EXPIRY_WARNINGS = [30, 7, 0] as const;

export const DOCUMENT_CATEGORIES = [
  "minutes",
  "bylaws",
  "financial_statement",
  "budget",
  "report",
  "contract",
  "quote",
  "policy",
  "deed",
  "certificate",
  "plan",
  "correspondence",
  "support",
  "other",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  minutes: "Actas",
  bylaws: "Reglamentos y manuales de convivencia",
  financial_statement: "Estados financieros",
  budget: "Presupuestos",
  report: "Informes de gestión",
  contract: "Contratos",
  quote: "Cotizaciones",
  policy: "Pólizas y seguros",
  deed: "Títulos y escrituras",
  certificate: "Certificados y registros",
  plan: "Planos y manuales técnicos",
  correspondence: "Correspondencia",
  support: "Soportes",
  other: "Otros",
};

export const DOCUMENT_CATEGORY_HINTS: Record<DocumentCategory, string> = {
  minutes: "Asambleas y reuniones del consejo",
  bylaws: "Reglamento de propiedad horizontal, manual de convivencia, reglamentos de uso",
  financial_statement: "Balances, estados de resultados y notas",
  budget: "Presupuestos aprobados y su ejecución",
  report: "Informes de la administración y del revisor fiscal",
  contract: "Vigilancia, aseo, mantenimiento, administración…",
  quote: "Propuestas de proveedores para comparar",
  policy: "Póliza de áreas comunes, responsabilidad civil, manejo",
  deed: "Escrituras, certificados de tradición y libertad",
  certificate: "Personería jurídica, RUT, certificados bancarios",
  plan: "Planos, manuales de equipos, licencias de construcción",
  correspondence: "Cartas y oficios enviados o recibidos",
  support: "Soportes de gestión y evidencias",
  other: "Lo que no encaja en otra categoría",
};

export const DOCUMENT_CATEGORY_ICONS: Record<DocumentCategory, string> = {
  minutes: "mdi-file-document-edit-outline",
  bylaws: "mdi-scale-balance",
  financial_statement: "mdi-chart-box-outline",
  budget: "mdi-calculator-variant-outline",
  report: "mdi-clipboard-text-outline",
  contract: "mdi-file-sign",
  quote: "mdi-file-compare",
  policy: "mdi-shield-check-outline",
  deed: "mdi-home-city-outline",
  certificate: "mdi-certificate-outline",
  plan: "mdi-floor-plan",
  correspondence: "mdi-email-outline",
  support: "mdi-paperclip",
  other: "mdi-file-outline",
};

/** Las categorías que suelen tener vencimiento (se pide la fecha) */
export const DOCUMENT_EXPIRING_CATEGORIES: readonly DocumentCategory[] = [
  "contract",
  "policy",
  "certificate",
  "quote",
];

/**
 * Quién puede ver un documento. La administración siempre ve todo.
 *
 * | Visibilidad | Residentes | Propietarios | Consejo y revisor | Contador | Personal y vigilancia |
 * | community   | ✓          | ✓            | ✓                 | ✓        | ✓                     |
 * | owners      |            | ✓            | ✓                 | ✓        |                       |
 * | council     |            |              | ✓                 |          |                       |
 * | staff       |            |              |                   |          | ✓                     |
 * | units       |            | de esas unidades                                                   |
 * | private     | solo la administración                                                         |
 */
export const DOCUMENT_VISIBILITIES = [
  "community",
  "owners",
  "council",
  "staff",
  "units",
  "private",
] as const;
export type DocumentVisibility = (typeof DOCUMENT_VISIBILITIES)[number];

export const DOCUMENT_VISIBILITY_LABELS: Record<DocumentVisibility, string> = {
  community: "Toda la comunidad",
  owners: "Propietarios",
  council: "Consejo de administración",
  staff: "Personal del conjunto",
  units: "Propietarios de unidades específicas",
  private: "Solo la administración",
};

export const DOCUMENT_VISIBILITY_DESCRIPTIONS: Record<DocumentVisibility, string> = {
  community:
    "Todos los residentes (propietarios, arrendatarios y su familia), el consejo y el personal.",
  owners: "Solo los propietarios, el consejo, el revisor fiscal y el contador. No los arrendatarios.",
  council: "El consejo de administración y el revisor fiscal.",
  staff: "El personal y la vigilancia: protocolos, manuales de equipos, turnos.",
  units: "Solo los propietarios de las unidades que elijas: títulos, paz y salvos, cartas.",
  private: "Nadie más que la administración: borradores, contratos en negociación, asuntos legales.",
};

export const DOCUMENT_VISIBILITY_ICONS: Record<DocumentVisibility, string> = {
  community: "mdi-account-group-outline",
  owners: "mdi-key-outline",
  council: "mdi-account-tie-outline",
  staff: "mdi-badge-account-outline",
  units: "mdi-door",
  private: "mdi-lock-outline",
};

/** Visibilidad sugerida al elegir la categoría (Ley 675: los propietarios ven actas y estados financieros) */
export const DOCUMENT_DEFAULT_VISIBILITY: Record<DocumentCategory, DocumentVisibility> = {
  minutes: "owners",
  bylaws: "community",
  financial_statement: "owners",
  budget: "owners",
  report: "owners",
  contract: "council",
  quote: "council",
  policy: "council",
  deed: "units",
  certificate: "council",
  plan: "staff",
  correspondence: "private",
  support: "council",
  other: "private",
};

export type DocumentStatus = "draft" | "published" | "archived";

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

export type DocumentFolder = {
  id: string;
  name: string;
  parentId: string | null;
  /** Documentos que el usuario puede ver directamente en la carpeta */
  documentCount: number;
};

export type DocumentFile = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** 1 para el primer archivo; sube con cada nueva versión */
  version: number;
  uploadedAt: string;
  uploadedBy: string | null;
};

export type DocumentItem = {
  id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  /** Número de acta, de contrato, de póliza… */
  reference: string | null;
  /** Fecha del documento (de la asamblea, de firma, de expedición) */
  documentDate: string | null;
  /** Vencimiento (contratos, pólizas, certificados) */
  expiresOn: string | null;
  folder: { id: string; name: string } | null;
  /** La versión vigente */
  file: DocumentFile | null;
  status: DocumentStatus;
  publishedAt: string | null;
  updatedAt: string | null;
  /** Solo para la administración */
  visibility?: DocumentVisibility;
  units?: UnitRef[];
  vendor?: { id: string; name: string } | null;
  versionCount?: number;
  viewCount?: number;
};

export type DocumentAccess = {
  id: string;
  user: { id: string; fullName: string };
  action: "view" | "download";
  fileName: string;
  version: number;
  at: string;
};

export type DocumentDetail = DocumentItem & {
  /** Todas las versiones, la vigente primero (solo administración) */
  versions?: Array<DocumentFile & Pick<Attachment, "ownerId">>;
  /** Últimas consultas (solo administración) */
  access?: DocumentAccess[];
  createdAt: string;
  uploadedBy: string | null;
};

export type DocumentInput = {
  title: string;
  description: string | null;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  reference: string | null;
  documentDate: string | null;
  expiresOn: string | null;
  folderId: string | null;
  vendorId: string | null;
  unitIds: string[];
};

export type DocumentFolderInput = { name: string; parentId: string | null };

export type DocumentStats = {
  total: number;
  drafts: number;
  /** Vencen en los próximos 30 días o ya vencieron (publicados, no archivados) */
  expiring: number;
  byCategory: Partial<Record<DocumentCategory, number>>;
};
