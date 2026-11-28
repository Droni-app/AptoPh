import type { EnrollmentRole } from "./index.js";
import type { UnitRef } from "./api.js";

/**
 * Encuestas a los propietarios antes de las asambleas (docs/surveys.md).
 * Una respuesta por unidad, la da un propietario; los resultados se cuentan
 * por votos (unidades) y por coeficiente de copropiedad.
 */

/** Crean, publican y eliminan borradores */
export const SURVEY_MANAGE_ROLES: readonly EnrollmentRole[] = ["administrator"];
/** Consultan las encuestas y sus resultados en el backoffice */
export const SURVEY_READ_ROLES: readonly EnrollmentRole[] = [
  "administrator",
  "council_member",
  "fiscal_reviewer",
];

export const SURVEY_MAX_QUESTIONS = 30;
export const SURVEY_MAX_OPTIONS = 12;
/** Horas antes del cierre en que se recuerda a las unidades que no han votado */
export const SURVEY_REMINDER_HOURS = 24;

export type SurveyStatus = "draft" | "open" | "closed";

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  draft: "Borrador",
  open: "Abierta",
  closed: "Cerrada",
};

/** Cuándo ven los propietarios los resultados */
export const SURVEY_RESULTS_VISIBILITY = ["after_vote", "after_close"] as const;
export type SurveyResultsVisibility = (typeof SURVEY_RESULTS_VISIBILITY)[number];

export const SURVEY_RESULTS_VISIBILITY_LABELS: Record<SurveyResultsVisibility, string> = {
  after_vote: "Al votar",
  after_close: "Al cierre",
};

export const SURVEY_RESULTS_VISIBILITY_DESCRIPTIONS: Record<SurveyResultsVisibility, string> = {
  after_vote: "Cada propietario ve cómo va la encuesta apenas vota.",
  after_close: "Nadie ve resultados hasta la fecha límite: evita que el resultado parcial influya.",
};

export type SurveyOption = { id: string; label: string };

export type SurveyQuestion = {
  id: string;
  text: string;
  description: string | null;
  options: SurveyOption[];
};

export type SurveyOptionResult = {
  optionId: string;
  /** Unidades que eligieron la opción */
  votes: number;
  /** Suma de coeficientes de esas unidades (0 a 1) */
  coefficient: number;
};

export type SurveyQuestionResult = {
  questionId: string;
  options: SurveyOptionResult[];
};

export type SurveyParticipation = {
  /** Unidades con coeficiente que pueden votar */
  eligibleUnits: number;
  votedUnits: number;
  /** Suma de coeficientes de las unidades que votaron (0 a 1) */
  votedCoefficient: number;
  /** Suma de coeficientes de todas las unidades (normalmente 1) */
  totalCoefficient: number;
  /** Participación mínima esperada, sobre el coeficiente (0 a 100); null sin mínimo */
  minParticipation: number | null;
  /** Se alcanzó la participación mínima (true si no hay mínimo) */
  reached: boolean;
};

export type SurveyResults = {
  participation: SurveyParticipation;
  questions: SurveyQuestionResult[];
};

export type SurveyItem = {
  id: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  /** Cuándo se publicó (abrió) */
  opensAt: string | null;
  closesAt: string;
  anonymous: boolean;
  resultsVisibility: SurveyResultsVisibility;
  minParticipation: number | null;
  questionCount: number;
  /** Solo backoffice */
  participation?: SurveyParticipation;
  createdAt: string;
};

export type SurveyDetail = SurveyItem & {
  questions: SurveyQuestion[];
  /** null mientras la persona no pueda verlos */
  results: SurveyResults | null;
  createdBy: string | null;
};

/** Voto de una unidad (backoffice). `answers` solo en encuestas nominales. */
export type SurveyVoter = {
  unit: UnitRef;
  coefficient: number;
  votedBy: string | null;
  votedAt: string;
  /** questionId → optionId */
  answers: Record<string, string> | null;
};

/** Unidad del propietario en una encuesta del portal */
export type ResidentSurveyUnit = {
  unit: UnitRef;
  coefficient: number;
  votedAt: string | null;
  votedBy: string | null;
};

export type ResidentSurveyItem = SurveyItem & {
  units: ResidentSurveyUnit[];
  /** Puede votar por alguna unidad ahora */
  canVote: boolean;
  /** Puede ver los resultados */
  canSeeResults: boolean;
};

export type ResidentSurveyDetail = ResidentSurveyItem & {
  questions: SurveyQuestion[];
  results: SurveyResults | null;
};

export type SurveyInput = {
  title: string;
  description: string | null;
  /** Fecha y hora límite (ISO con zona); la encuesta abre al publicarla */
  closesAt: string;
  anonymous: boolean;
  resultsVisibility: SurveyResultsVisibility;
  minParticipation: number | null;
  questions: Array<{
    text: string;
    description: string | null;
    options: string[];
  }>;
};

export type SurveyVoteInput = {
  unitIds: string[];
  /** questionId → optionId; todas las preguntas son obligatorias */
  answers: Record<string, string>;
};
