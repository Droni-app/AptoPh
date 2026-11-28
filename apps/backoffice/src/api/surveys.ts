import type {
  ApiItem,
  ApiPaginated,
  SurveyDetail,
  SurveyInput,
  SurveyItem,
  SurveyVoter,
} from '@aptoph/shared'
import { api } from '@/lib/http'

const base = '/api/v1/surveys'

export type SurveyListStatus = 'active' | 'draft' | 'open' | 'closed' | ''

/** Surveys to the owners (docs/surveys.md) */
export const surveysApi = {
  list: (query: { status?: SurveyListStatus; page?: number }) =>
    api<ApiPaginated<SurveyItem>>(base, {
      query: { status: query.status || undefined, page: query.page },
    }),
  stats: () =>
    api<ApiItem<{ drafts: number; open: number; closed: number }>>('/api/v1/surveys-stats'),
  get: (id: string) => api<ApiItem<SurveyDetail>>(`${base}/${id}`),
  voters: (id: string) => api<{ data: SurveyVoter[] }>(`${base}/${id}/voters`),
  create: (input: SurveyInput) => api<ApiItem<SurveyDetail>>(base, { method: 'POST', body: input }),
  update: (id: string, input: SurveyInput) =>
    api<ApiItem<SurveyDetail>>(`${base}/${id}`, { method: 'PUT', body: input }),
  publish: (id: string, notify: boolean) =>
    api<ApiItem<SurveyDetail> & { notified: number }>(`${base}/${id}/publish`, {
      method: 'POST',
      body: { notify },
    }),
  remove: (id: string) => api<void>(`${base}/${id}`, { method: 'DELETE' }),
}
