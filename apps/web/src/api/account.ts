import type {
  AcceptInvitationInput,
  AccountSession,
  ApiItem,
  AuthSession,
  ChangePasswordInput,
  InvitationPreview,
  InvitationSession,
  NotificationList,
  NotificationPreferences,
  ProfileInput,
  UserProfile,
} from '@aptoph/shared'
import { api } from '@/lib/http'

/** Links sent by email open in this app */
const APP = 'web' as const

/**
 * Public endpoints: password reset, email confirmation and invitations
 * (no session and no conjunto)
 */
export const publicAuthApi = {
  forgotPassword: (email: string) =>
    api<void>('/api/v1/auth/password/forgot', {
      method: 'POST',
      body: { email, app: APP },
      auth: false,
      tenant: false,
    }),
  resetPassword: (token: string, password: string, device: string) =>
    api<ApiItem<AuthSession>>('/api/v1/auth/password/reset', {
      method: 'POST',
      body: { token, password, device },
      auth: false,
      tenant: false,
    }),
  verifyEmail: (token: string) =>
    api<void>('/api/v1/auth/email/verify', {
      method: 'POST',
      body: { token },
      auth: false,
      tenant: false,
    }),
  invitation: (token: string) =>
    api<ApiItem<InvitationPreview>>(`/api/v1/invitations/${encodeURIComponent(token)}`, {
      auth: false,
      tenant: false,
    }),
  acceptInvitation: (input: AcceptInvitationInput) =>
    api<ApiItem<InvitationSession>>('/api/v1/invitations/accept', {
      method: 'POST',
      body: input,
      auth: false,
      tenant: false,
    }),
}

/**
 * The signed-in person's own account
 */
export const accountApi = {
  updateProfile: (input: ProfileInput) =>
    api<ApiItem<UserProfile>>('/api/v1/account/profile', {
      method: 'PATCH',
      body: input,
      tenant: false,
    }),
  changePassword: (input: ChangePasswordInput) =>
    api<void>('/api/v1/account/password', { method: 'PUT', body: input, tenant: false }),
  sessions: () => api<{ data: AccountSession[] }>('/api/v1/account/sessions', { tenant: false }),
  closeSession: (id: string) =>
    api<void>(`/api/v1/account/sessions/${id}`, { method: 'DELETE', tenant: false }),
  closeOtherSessions: () =>
    api<void>('/api/v1/account/sessions', { method: 'DELETE', tenant: false }),
  sendVerification: () =>
    api<void>('/api/v1/account/email/verification', {
      method: 'POST',
      body: { app: APP },
      tenant: false,
    }),
}

/**
 * The bell of this app in the active conjunto, and the channels of the
 * account (docs/notifications.md)
 */
export const notificationsApi = {
  list: () => api<NotificationList>('/api/v1/notifications', { query: { app: APP } }),
  unread: () => api<{ unread: number }>('/api/v1/notifications/unread', { query: { app: APP } }),
  read: (id: string) =>
    api<{ unread: number }>(`/api/v1/notifications/${id}/read`, { method: 'POST' }),
  readAll: () =>
    api<{ unread: number }>('/api/v1/notifications/read-all', {
      method: 'POST',
      body: { app: APP },
    }),
  preferences: () =>
    api<{ data: NotificationPreferences; devices: number; pushAvailable: boolean }>(
      '/api/v1/account/notification-preferences',
      { tenant: false },
    ),
  savePreferences: (preferences: NotificationPreferences) =>
    api<{ data: NotificationPreferences }>('/api/v1/account/notification-preferences', {
      method: 'PUT',
      body: { preferences },
      tenant: false,
    }),
}
