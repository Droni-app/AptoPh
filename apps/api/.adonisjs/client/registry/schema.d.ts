/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractRawResponse, ExtractResponse, Method, PathWithRegistry, PatternsByMethod, RouteWithRegistry } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'
import type { routes } from './index.ts'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'drive.fs.serve': {
    methods: ["GET","HEAD"]
    pattern: '/uploads/*'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { '*': ParamValue[] }
      query: {}
      response: unknown
      errorResponse: unknown
      rawResponse: ExtractRawResponse<unknown>
    }
  }
  'auth.login': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/auth').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/auth').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['login']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['login']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['login']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.signup': {
    methods: ["POST"]
    pattern: '/api/v1/auth/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/signup').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/signup').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['signup']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['signup']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['signup']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.logout': {
    methods: ["POST"]
    pattern: '/api/v1/auth/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['logout']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['logout']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['logout']>>>
    }
  }
  'auth.password.forgot': {
    methods: ["POST"]
    pattern: '/api/v1/auth/password/forgot'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/account').forgotPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/account').forgotPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['forgotPassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['forgotPassword']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['forgotPassword']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.password.reset': {
    methods: ["POST"]
    pattern: '/api/v1/auth/password/reset'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/account').resetPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/account').resetPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['resetPassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['resetPassword']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['resetPassword']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.email.verify': {
    methods: ["POST"]
    pattern: '/api/v1/auth/email/verify'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/account').verifyEmailValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/account').verifyEmailValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['verifyEmail']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['verifyEmail']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/auth_controller').default['verifyEmail']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.providers': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/auth/providers'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/google_auth_controller').default['providers']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/google_auth_controller').default['providers']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/google_auth_controller').default['providers']>>>
    }
  }
  'auth.google.start': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/auth/google/url'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/auth/google').googleStartValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/google_auth_controller').default['start']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/google_auth_controller').default['start']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/google_auth_controller').default['start']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.google.callback': {
    methods: ["POST"]
    pattern: '/api/v1/auth/google'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/google').googleCallbackValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/google').googleCallbackValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/google_auth_controller').default['callback']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/google_auth_controller').default['callback']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/google_auth_controller').default['callback']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.google.token': {
    methods: ["POST"]
    pattern: '/api/v1/auth/google/token'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/google').googleTokenValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/google').googleTokenValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/google_auth_controller').default['token']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/google_auth_controller').default['token']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/google_auth_controller').default['token']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'invitations.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/invitations/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tenants/invitations_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tenants/invitations_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tenants/invitations_controller').default['show']>>>
    }
  }
  'invitations.accept': {
    methods: ["POST"]
    pattern: '/api/v1/invitations/accept'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/account').acceptInvitationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/account').acceptInvitationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tenants/invitations_controller').default['accept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tenants/invitations_controller').default['accept']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tenants/invitations_controller').default['accept']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/profile_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/profile_controller').default['show']>>>
    }
  }
  'profile.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/account/profile'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/account').updateProfileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/account').updateProfileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['updateProfile']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['updateProfile']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['updateProfile']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.password': {
    methods: ["PUT"]
    pattern: '/api/v1/account/password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/account').changePasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/account').changePasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['changePassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['changePassword']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['changePassword']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.sessions.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/sessions'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['sessions']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['sessions']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['sessions']>>>
    }
  }
  'profile.sessions.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/account/sessions/:sessionId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { sessionId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['destroySession']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['destroySession']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['destroySession']>>>
    }
  }
  'profile.sessions.destroyOthers': {
    methods: ["DELETE"]
    pattern: '/api/v1/account/sessions'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['destroyOtherSessions']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['destroyOtherSessions']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['destroyOtherSessions']>>>
    }
  }
  'profile.email.verification': {
    methods: ["POST"]
    pattern: '/api/v1/account/email/verification'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/account').sendVerificationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/account').sendVerificationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['sendVerification']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['sendVerification']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth/account_controller').default['sendVerification']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.tenants': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/tenants'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tenants/my_tenants_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tenants/my_tenants_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tenants/my_tenants_controller').default['index']>>>
    }
  }
  'profile.notifications.preferences': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/notification-preferences'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications/notification_settings_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications/notification_settings_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/notifications/notification_settings_controller').default['show']>>>
    }
  }
  'profile.notifications.preferences.update': {
    methods: ["PUT"]
    pattern: '/api/v1/account/notification-preferences'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/notifications/notifications').preferencesValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/notifications/notifications').preferencesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications/notification_settings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications/notification_settings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/notifications/notification_settings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.push.store': {
    methods: ["POST"]
    pattern: '/api/v1/account/push-devices'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/notifications/notifications').pushDeviceValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/notifications/notifications').pushDeviceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications/notification_settings_controller').default['registerDevice']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications/notification_settings_controller').default['registerDevice']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/notifications/notification_settings_controller').default['registerDevice']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.push.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/account/push-devices/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications/notification_settings_controller').default['removeDevice']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications/notification_settings_controller').default['removeDevice']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/notifications/notification_settings_controller').default['removeDevice']>>>
    }
  }
  'notifications.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/notifications'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/notifications/notifications').listNotificationsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications/notifications_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications/notifications_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/notifications/notifications_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'notifications.unread': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/notifications/unread'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/notifications/notifications').readAllValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications/notifications_controller').default['unreadCount']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications/notifications_controller').default['unreadCount']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/notifications/notifications_controller').default['unreadCount']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'notifications.readAll': {
    methods: ["POST"]
    pattern: '/api/v1/notifications/read-all'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/notifications/notifications').readAllValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/notifications/notifications').readAllValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications/notifications_controller').default['readAll']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications/notifications_controller').default['readAll']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/notifications/notifications_controller').default['readAll']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'notifications.read': {
    methods: ["POST"]
    pattern: '/api/v1/notifications/:id/read'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications/notifications_controller').default['read']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications/notifications_controller').default['read']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/notifications/notifications_controller').default['read']>>>
    }
  }
  'tenant.current': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/tenant'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tenants/my_tenants_controller').default['current']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tenants/my_tenants_controller').default['current']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tenants/my_tenants_controller').default['current']>>>
    }
  }
  'resident.home': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/home'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard/resident_home_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard/resident_home_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/dashboard/resident_home_controller').default['show']>>>
    }
  }
  'resident.units.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/units/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/resident_units_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/resident_units_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/resident_units_controller').default['show']>>>
    }
  }
  'resident.vehicles.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/units/:unitId/vehicles'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/resident').createVehicleValidator)>>
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/property/resident').createVehicleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/resident_vehicles_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/resident_vehicles_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/resident_vehicles_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.vehicles.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/resident/vehicles/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/resident').updateVehicleValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/property/resident').updateVehicleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/resident_vehicles_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/resident_vehicles_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/resident_vehicles_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.vehicles.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/resident/vehicles/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/resident_vehicles_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/resident_vehicles_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/resident_vehicles_controller').default['destroy']>>>
    }
  }
  'resident.pets.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/units/:unitId/pets'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/resident').createPetValidator)>>
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/property/resident').createPetValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/resident_pets_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/resident_pets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/resident_pets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.pets.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/resident/pets/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/resident').updatePetValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/property/resident').updatePetValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/resident_pets_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/resident_pets_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/resident_pets_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.pets.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/resident/pets/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/resident_pets_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/resident_pets_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/resident_pets_controller').default['destroy']>>>
    }
  }
  'resident.household.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/units/:unitId/household'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/resident').createHouseholdMemberValidator)>>
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/property/resident').createHouseholdMemberValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/resident_household_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/resident_household_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/resident_household_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.household.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/resident/household/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/resident').updateHouseholdMemberValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/property/resident').updateHouseholdMemberValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/resident_household_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/resident_household_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/resident_household_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.household.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/resident/household/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/resident_household_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/resident_household_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/resident_household_controller').default['destroy']>>>
    }
  }
  'resident.visits.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/visits'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/gatehouse/resident_visits_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/gatehouse/resident_visits_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/gatehouse/resident_visits_controller').default['index']>>>
    }
  }
  'resident.visits.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/visits'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/gatehouse/resident').createVisitValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/gatehouse/resident').createVisitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/gatehouse/resident_visits_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/gatehouse/resident_visits_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/gatehouse/resident_visits_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.visits.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/resident/visits/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/gatehouse/resident_visits_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/gatehouse/resident_visits_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/gatehouse/resident_visits_controller').default['destroy']>>>
    }
  }
  'resident.parcels.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/parcels'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/gatehouse/resident_parcels_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/gatehouse/resident_parcels_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/gatehouse/resident_parcels_controller').default['index']>>>
    }
  }
  'resident.amenities.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/amenities'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['amenities']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['amenities']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['amenities']>>>
    }
  }
  'resident.amenities.availability': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/amenities/:id/availability'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/amenities/amenities').rangeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['availability']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['availability']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['availability']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.bookings.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/bookings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['index']>>>
    }
  }
  'resident.bookings.quote': {
    methods: ["POST"]
    pattern: '/api/v1/resident/bookings/quote'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/amenities/amenities').bookingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/amenities/amenities').bookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['quote']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['quote']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['quote']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.bookings.attachments.url': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/bookings/attachments/:id/url'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/files/attachment').attachmentUrlValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['attachmentUrl']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['attachmentUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['attachmentUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.bookings.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/bookings/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['show']>>>
    }
  }
  'resident.bookings.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/bookings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/amenities/amenities').bookingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/amenities/amenities').bookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.bookings.attachments.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/bookings/:id/attachments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/files/attachment').uploadAttachmentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/files/attachment').uploadAttachmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['attach']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['attach']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['attach']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.bookings.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/resident/bookings/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/amenities/amenities').cancelBookingValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/amenities/amenities').cancelBookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/resident_bookings_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.tickets.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/tickets'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tickets/resident_tickets_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tickets/resident_tickets_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tickets/resident_tickets_controller').default['index']>>>
    }
  }
  'resident.tickets.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/tickets'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/tickets/resident').createTicketValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/tickets/resident').createTicketValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tickets/resident_tickets_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tickets/resident_tickets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tickets/resident_tickets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.tickets.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/tickets/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tickets/resident_tickets_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tickets/resident_tickets_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tickets/resident_tickets_controller').default['show']>>>
    }
  }
  'resident.tickets.comments.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/tickets/:id/comments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/tickets/resident').createTicketCommentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/tickets/resident').createTicketCommentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tickets/resident_tickets_controller').default['comment']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tickets/resident_tickets_controller').default['comment']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tickets/resident_tickets_controller').default['comment']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.statement': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/units/:unitId/statement'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/finance').statementValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['statement']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['statement']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['statement']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.payments.report': {
    methods: ["POST"]
    pattern: '/api/v1/resident/units/:unitId/payments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').reportPaymentValidator)>>
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').reportPaymentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['report']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['report']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['report']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.payments.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/payments'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['payments']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['payments']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['payments']>>>
    }
  }
  'resident.payments.receipt': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/payments/:id/receipt'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['receipt']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['receipt']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['receipt']>>>
    }
  }
  'resident.clearance.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/units/:unitId/clearance'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['clearance']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['clearance']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['clearance']>>>
    }
  }
  'resident.clearances.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/units/:unitId/clearances'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['issueClearance']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['issueClearance']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['issueClearance']>>>
    }
  }
  'resident.clearances.pdf': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/clearances/:id/pdf'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['clearancePdf']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['clearancePdf']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['clearancePdf']>>>
    }
  }
  'resident.payments.attachments.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/payments/:id/attachments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/files/attachment').uploadAttachmentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/files/attachment').uploadAttachmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['attach']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['attach']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['attach']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.attachments.url': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/attachments/:id/url'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/files/attachment').attachmentUrlValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['attachmentUrl']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['attachmentUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['attachmentUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.attachments.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/resident/attachments/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['detach']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['detach']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/resident_finance_controller').default['detach']>>>
    }
  }
  'resident.announcements.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/announcements'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/resident_announcements_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/resident_announcements_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/resident_announcements_controller').default['index']>>>
    }
  }
  'resident.announcements.attachments.url': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/announcements/attachments/:id/url'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/files/attachment').attachmentUrlValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/resident_announcements_controller').default['attachmentUrl']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/resident_announcements_controller').default['attachmentUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/resident_announcements_controller').default['attachmentUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.announcements.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/announcements/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/resident_announcements_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/resident_announcements_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/resident_announcements_controller').default['show']>>>
    }
  }
  'resident.documents.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/documents'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/resident_documents_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/resident_documents_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/resident_documents_controller').default['index']>>>
    }
  }
  'resident.documents.folders': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/documents/folders'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/resident_documents_controller').default['folders']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/resident_documents_controller').default['folders']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/resident_documents_controller').default['folders']>>>
    }
  }
  'resident.documents.files.url': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/documents/files/:id/url'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/resident_documents_controller').default['fileUrl']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/resident_documents_controller').default['fileUrl']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/resident_documents_controller').default['fileUrl']>>>
    }
  }
  'resident.documents.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/documents/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/resident_documents_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/resident_documents_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/resident_documents_controller').default['show']>>>
    }
  }
  'resident.surveys.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/surveys'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/surveys/resident_surveys_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/surveys/resident_surveys_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/surveys/resident_surveys_controller').default['index']>>>
    }
  }
  'resident.surveys.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/surveys/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/surveys/resident_surveys_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/surveys/resident_surveys_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/surveys/resident_surveys_controller').default['show']>>>
    }
  }
  'resident.surveys.vote': {
    methods: ["POST"]
    pattern: '/api/v1/resident/surveys/:id/vote'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/surveys/surveys').surveyVoteValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/surveys/surveys').surveyVoteValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/surveys/resident_surveys_controller').default['vote']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/surveys/resident_surveys_controller').default['vote']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/surveys/resident_surveys_controller').default['vote']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.parking.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/parking'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/resident_parking_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/resident_parking_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/resident_parking_controller').default['show']>>>
    }
  }
  'resident.parking.apply': {
    methods: ["POST"]
    pattern: '/api/v1/resident/parking/applications'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/parking').applyValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/property/parking').applyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/resident_parking_controller').default['apply']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/resident_parking_controller').default['apply']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/resident_parking_controller').default['apply']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.parking.withdraw': {
    methods: ["POST"]
    pattern: '/api/v1/resident/parking/applications/:id/withdraw'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/resident_parking_controller').default['withdraw']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/resident_parking_controller').default['withdraw']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/resident_parking_controller').default['withdraw']>>>
    }
  }
  'resident.parking.accept': {
    methods: ["POST"]
    pattern: '/api/v1/resident/parking/applications/:id/accept'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/resident_parking_controller').default['accept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/resident_parking_controller').default['accept']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/resident_parking_controller').default['accept']>>>
    }
  }
  'resident.parking.decline': {
    methods: ["POST"]
    pattern: '/api/v1/resident/parking/applications/:id/decline'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/resident_parking_controller').default['decline']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/resident_parking_controller').default['decline']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/resident_parking_controller').default['decline']>>>
    }
  }
  'dashboard': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard/dashboard_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard/dashboard_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/dashboard/dashboard_controller').default['show']>>>
    }
  }
  'buildings.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/buildings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/buildings_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/buildings_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/buildings_controller').default['index']>>>
    }
  }
  'buildings.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/buildings/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/buildings_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/buildings_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/buildings_controller').default['show']>>>
    }
  }
  'units.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/units'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/property/unit').listUnitsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/units_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/units_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/units_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'units.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/units/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/units_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/units_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/units_controller').default['show']>>>
    }
  }
  'occupants.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/units/:unitId/occupants'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/unit_occupants_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/unit_occupants_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/unit_occupants_controller').default['index']>>>
    }
  }
  'members.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/members'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tenants/members_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tenants/members_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tenants/members_controller').default['index']>>>
    }
  }
  'subscription.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/subscription'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing/subscription_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing/subscription_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing/subscription_controller').default['show']>>>
    }
  }
  'emailQuota.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/email-quota'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/email_quota_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/email_quota_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/email_quota_controller').default['show']>>>
    }
  }
  'settings.tenant': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/settings/tenant'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tenants/tenant_settings_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tenants/tenant_settings_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tenants/tenant_settings_controller').default['show']>>>
    }
  }
  'announcements.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/announcements'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/announcements/announcement').listAnnouncementsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'announcements.attachments.url': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/announcements/attachments/:id/url'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/files/attachment').attachmentUrlValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['attachmentUrl']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['attachmentUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['attachmentUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'announcements.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/announcements/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['show']>>>
    }
  }
  'announcements.readers': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/announcements/:id/readers'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['readers']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['readers']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['readers']>>>
    }
  }
  'announcements.store': {
    methods: ["POST"]
    pattern: '/api/v1/announcements'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/announcements/announcement').announcementValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/announcements/announcement').announcementValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'announcements.emailPreview': {
    methods: ["POST"]
    pattern: '/api/v1/announcements/email-preview'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/announcements/announcement').emailPreviewValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/announcements/announcement').emailPreviewValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['emailPreview']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['emailPreview']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['emailPreview']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'announcements.update': {
    methods: ["PUT"]
    pattern: '/api/v1/announcements/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/announcements/announcement').announcementValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/announcements/announcement').announcementValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'announcements.publish': {
    methods: ["POST"]
    pattern: '/api/v1/announcements/:id/publish'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['publish']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['publish']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['publish']>>>
    }
  }
  'announcements.unpublish': {
    methods: ["POST"]
    pattern: '/api/v1/announcements/:id/unpublish'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['unpublish']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['unpublish']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['unpublish']>>>
    }
  }
  'announcements.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/announcements/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['destroy']>>>
    }
  }
  'announcements.image.set': {
    methods: ["PUT"]
    pattern: '/api/v1/announcements/:id/image'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/files/attachment').uploadAnnouncementImageValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/files/attachment').uploadAnnouncementImageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['setImage']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['setImage']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['setImage']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'announcements.image.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/announcements/:id/image'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['removeImage']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['removeImage']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['removeImage']>>>
    }
  }
  'announcements.attachments.store': {
    methods: ["POST"]
    pattern: '/api/v1/announcements/:id/attachments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/files/attachment').uploadAttachmentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/files/attachment').uploadAttachmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['attach']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['attach']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['attach']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'announcements.attachments.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/announcements/attachments/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['detach']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['detach']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/announcements_controller').default['detach']>>>
    }
  }
  'amenities.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/amenities'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/amenities_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/amenities_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/amenities_controller').default['index']>>>
    }
  }
  'bookings.calendar': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/bookings/calendar'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/amenities/amenities').rangeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['calendar']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['calendar']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['calendar']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'bookings.stats': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/bookings/stats'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['stats']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['stats']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['stats']>>>
    }
  }
  'bookings.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/bookings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/amenities/amenities').bookingListValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'bookings.attachments.url': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/bookings/attachments/:id/url'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/files/attachment').attachmentUrlValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['attachmentUrl']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['attachmentUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['attachmentUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'bookings.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/bookings/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['show']>>>
    }
  }
  'amenities.store': {
    methods: ["POST"]
    pattern: '/api/v1/amenities'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/amenities/amenities').amenityValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/amenities/amenities').amenityValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/amenities_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/amenities_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/amenities_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'amenities.update': {
    methods: ["PUT"]
    pattern: '/api/v1/amenities/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/amenities/amenities').amenityValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/amenities/amenities').amenityValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/amenities_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/amenities_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/amenities_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'amenities.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/amenities/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/amenities_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/amenities_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/amenities_controller').default['destroy']>>>
    }
  }
  'bookings.quote': {
    methods: ["POST"]
    pattern: '/api/v1/bookings/quote'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/amenities/amenities').staffBookingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/amenities/amenities').staffBookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['quote']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['quote']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['quote']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'bookings.store': {
    methods: ["POST"]
    pattern: '/api/v1/bookings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/amenities/amenities').staffBookingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/amenities/amenities').staffBookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'bookings.approve': {
    methods: ["POST"]
    pattern: '/api/v1/bookings/:id/approve'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/amenities/amenities').approveBookingValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/amenities/amenities').approveBookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['approve']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['approve']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['approve']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'bookings.reject': {
    methods: ["POST"]
    pattern: '/api/v1/bookings/:id/reject'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/amenities/amenities').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/amenities/amenities').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['reject']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['reject']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['reject']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'bookings.cancel': {
    methods: ["POST"]
    pattern: '/api/v1/bookings/:id/cancel'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/amenities/amenities').cancelBookingValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/amenities/amenities').cancelBookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['cancel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['cancel']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['cancel']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'bookings.deposit': {
    methods: ["POST"]
    pattern: '/api/v1/bookings/:id/deposit'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/amenities/amenities').depositValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/amenities/amenities').depositValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['deposit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['deposit']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['deposit']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'bookings.attachments.store': {
    methods: ["POST"]
    pattern: '/api/v1/bookings/:id/attachments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/files/attachment').uploadAttachmentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/files/attachment').uploadAttachmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['attach']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['attach']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['attach']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'bookings.attachments.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/bookings/attachments/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['detach']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['detach']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/amenities/bookings_controller').default['detach']>>>
    }
  }
  'documents.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/documents'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/documents/documents').documentListValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'documents.folders': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/documents/folders'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['folders']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['folders']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['folders']>>>
    }
  }
  'documents.files.url': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/documents/files/:id/url'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/documents/documents').documentFileUrlValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['fileUrl']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['fileUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['fileUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'documents.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/documents/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['show']>>>
    }
  }
  'documents.stats': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/documents-stats'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['stats']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['stats']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['stats']>>>
    }
  }
  'documents.store': {
    methods: ["POST"]
    pattern: '/api/v1/documents'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/documents/documents').newDocumentValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/documents/documents').newDocumentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'documents.update': {
    methods: ["PUT"]
    pattern: '/api/v1/documents/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/documents/documents').documentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/documents/documents').documentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'documents.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/documents/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['destroy']>>>
    }
  }
  'documents.versions.store': {
    methods: ["POST"]
    pattern: '/api/v1/documents/:id/versions'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/documents/documents').documentFileValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/documents/documents').documentFileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['addVersion']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['addVersion']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['addVersion']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'documents.versions.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/documents/versions/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['removeVersion']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['removeVersion']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['removeVersion']>>>
    }
  }
  'documents.publish': {
    methods: ["POST"]
    pattern: '/api/v1/documents/:id/publish'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/documents/documents').publishDocumentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/documents/documents').publishDocumentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['publish']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['publish']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['publish']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'documents.unpublish': {
    methods: ["POST"]
    pattern: '/api/v1/documents/:id/unpublish'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['unpublish']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['unpublish']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['unpublish']>>>
    }
  }
  'documents.archive': {
    methods: ["POST"]
    pattern: '/api/v1/documents/:id/archive'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['archive']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['archive']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['archive']>>>
    }
  }
  'documents.restore': {
    methods: ["POST"]
    pattern: '/api/v1/documents/:id/restore'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['restore']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['restore']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['restore']>>>
    }
  }
  'documents.folders.store': {
    methods: ["POST"]
    pattern: '/api/v1/documents/folders'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/documents/documents').documentFolderValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/documents/documents').documentFolderValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['storeFolder']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['storeFolder']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['storeFolder']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'documents.folders.update': {
    methods: ["PUT"]
    pattern: '/api/v1/documents/folders/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/documents/documents').documentFolderValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/documents/documents').documentFolderValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['updateFolder']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['updateFolder']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['updateFolder']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'documents.folders.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/documents/folders/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['destroyFolder']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['destroyFolder']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/documents/documents_controller').default['destroyFolder']>>>
    }
  }
  'surveys.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/surveys'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/surveys/surveys').surveyListValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'surveys.stats': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/surveys-stats'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['stats']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['stats']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['stats']>>>
    }
  }
  'surveys.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/surveys/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['show']>>>
    }
  }
  'surveys.voters': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/surveys/:id/voters'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['voters']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['voters']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['voters']>>>
    }
  }
  'surveys.store': {
    methods: ["POST"]
    pattern: '/api/v1/surveys'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/surveys/surveys').surveyValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/surveys/surveys').surveyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'surveys.update': {
    methods: ["PUT"]
    pattern: '/api/v1/surveys/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/surveys/surveys').surveyValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/surveys/surveys').surveyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'surveys.publish': {
    methods: ["POST"]
    pattern: '/api/v1/surveys/:id/publish'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/surveys/surveys').publishSurveyValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/surveys/surveys').publishSurveyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['publish']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['publish']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['publish']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'surveys.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/surveys/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/surveys/surveys_controller').default['destroy']>>>
    }
  }
  'tickets.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/tickets'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/tickets/backoffice').listTicketsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'tickets.stats': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/tickets/stats'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['stats']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['stats']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['stats']>>>
    }
  }
  'tickets.assignees': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/tickets/assignees'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['assignees']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['assignees']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['assignees']>>>
    }
  }
  'tickets.attachments.url': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/tickets/attachments/:id/url'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/files/attachment').attachmentUrlValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['attachmentUrl']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['attachmentUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['attachmentUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'tickets.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/tickets/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['show']>>>
    }
  }
  'tickets.write.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/tickets/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/tickets/backoffice').updateTicketValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/tickets/backoffice').updateTicketValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'tickets.write.comments.store': {
    methods: ["POST"]
    pattern: '/api/v1/tickets/:id/comments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/tickets/backoffice').ticketCommentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/tickets/backoffice').ticketCommentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['comment']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['comment']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['comment']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'tickets.write.attachments.store': {
    methods: ["POST"]
    pattern: '/api/v1/tickets/:id/attachments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/files/attachment').uploadAttachmentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/files/attachment').uploadAttachmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['attach']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['attach']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['attach']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'tickets.write.attachments.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/tickets/attachments/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['detach']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['detach']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tickets/tickets_controller').default['detach']>>>
    }
  }
  'visitorParking.summary': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/visitor-parking/summary'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['summary']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['summary']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['summary']>>>
    }
  }
  'visitorParking.settings': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/visitor-parking/settings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['settings']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['settings']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['settings']>>>
    }
  }
  'visitorParking.lookup': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/visitor-parking/lookup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/gatehouse/visitor_parking').lookupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['lookup']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['lookup']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['lookup']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'visitorParking.stays.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/visitor-parking/stays'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/gatehouse/visitor_parking').listStaysValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'visitorParking.stays.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/visitor-parking/stays/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['show']>>>
    }
  }
  'visitorParking.write.stays.store': {
    methods: ["POST"]
    pattern: '/api/v1/visitor-parking/stays'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/gatehouse/visitor_parking').entryValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/gatehouse/visitor_parking').entryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'visitorParking.write.stays.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/visitor-parking/stays/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/gatehouse/visitor_parking').correctStayValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/gatehouse/visitor_parking').correctStayValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'visitorParking.write.stays.exit': {
    methods: ["POST"]
    pattern: '/api/v1/visitor-parking/stays/:id/exit'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/gatehouse/visitor_parking').exitValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/gatehouse/visitor_parking').exitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['exit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['exit']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['exit']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'visitorParking.write.stays.receipt': {
    methods: ["POST"]
    pattern: '/api/v1/visitor-parking/stays/:id/receipt'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/gatehouse/visitor_parking').receiptValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/gatehouse/visitor_parking').receiptValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['receipt']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['receipt']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['receipt']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'visitorParking.settings.update': {
    methods: ["PUT"]
    pattern: '/api/v1/visitor-parking/settings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/gatehouse/visitor_parking').parkingSettingsValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/gatehouse/visitor_parking').parkingSettingsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['updateSettings']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['updateSettings']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/gatehouse/visitor_parking_controller').default['updateSettings']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'parking.summary': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/parking/summary'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['summary']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['summary']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['summary']>>>
    }
  }
  'parking.spots.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/parking/spots'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/property/parking').listSpotsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['spots']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['spots']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['spots']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'parking.assignments.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/parking/assignments'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/property/parking').listAssignmentsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['assignments']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['assignments']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['assignments']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'parking.lookup': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/parking/lookup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/property/parking').parkingLookupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['lookup']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['lookup']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['lookup']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'parking.manage.read.settings': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/parking/settings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['settings']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['settings']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['settings']>>>
    }
  }
  'parking.manage.read.eligibility': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/parking/eligibility'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/property/parking').eligibilityValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['eligibility']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['eligibility']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['eligibility']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'parking.lotteries.read.lotteries.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/parking/lotteries'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['index']>>>
    }
  }
  'parking.lotteries.read.lotteries.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/parking/lotteries/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['show']>>>
    }
  }
  'parking.lotteries.read.lotteries.applications': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/parking/lotteries/:id/applications'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/property/parking').listApplicationsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['applications']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['applications']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['applications']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'parking.manage.settings.update': {
    methods: ["PUT"]
    pattern: '/api/v1/parking/settings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/parking').parkingSettingsValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/property/parking').parkingSettingsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['updateSettings']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['updateSettings']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['updateSettings']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'parking.manage.spots.store': {
    methods: ["POST"]
    pattern: '/api/v1/parking/spots'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/parking').createSpotValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/property/parking').createSpotValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['storeSpot']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['storeSpot']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['storeSpot']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'parking.manage.spots.batch': {
    methods: ["POST"]
    pattern: '/api/v1/parking/spots/batch'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/parking').spotBatchValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/property/parking').spotBatchValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['storeBatch']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['storeBatch']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['storeBatch']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'parking.manage.spots.import': {
    methods: ["POST"]
    pattern: '/api/v1/parking/spots/import'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['importSpots']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['importSpots']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['importSpots']>>>
    }
  }
  'parking.manage.spots.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/parking/spots/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/parking').updateSpotValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/property/parking').updateSpotValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['updateSpot']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['updateSpot']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['updateSpot']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'parking.manage.spots.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/parking/spots/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['destroySpot']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['destroySpot']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['destroySpot']>>>
    }
  }
  'parking.manage.assignments.store': {
    methods: ["POST"]
    pattern: '/api/v1/parking/assignments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/parking').assignValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/property/parking').assignValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['assign']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['assign']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['assign']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'parking.manage.assignments.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/parking/assignments/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/parking').updateAssignmentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/property/parking').updateAssignmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['updateAssignment']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['updateAssignment']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['updateAssignment']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'parking.manage.assignments.end': {
    methods: ["POST"]
    pattern: '/api/v1/parking/assignments/:id/end'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/parking').endAssignmentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/property/parking').endAssignmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['endAssignment']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['endAssignment']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_controller').default['endAssignment']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'parking.manage.lotteries.store': {
    methods: ["POST"]
    pattern: '/api/v1/parking/lotteries'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/parking').createLotteryValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/property/parking').createLotteryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'parking.manage.lotteries.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/parking/lotteries/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/parking').updateLotteryValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/property/parking').updateLotteryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'parking.manage.lotteries.cancel': {
    methods: ["POST"]
    pattern: '/api/v1/parking/lotteries/:id/cancel'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['cancel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['cancel']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['cancel']>>>
    }
  }
  'parking.manage.lotteries.draw': {
    methods: ["POST"]
    pattern: '/api/v1/parking/lotteries/:id/draw'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['draw']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['draw']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['draw']>>>
    }
  }
  'parking.manage.lotteries.offer': {
    methods: ["POST"]
    pattern: '/api/v1/parking/lotteries/:id/offer'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['offer']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['offer']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['offer']>>>
    }
  }
  'parking.manage.lotteries.apply': {
    methods: ["POST"]
    pattern: '/api/v1/parking/lotteries/:id/applications'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/parking').applyValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/property/parking').applyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['apply']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['apply']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['apply']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'parking.manage.applications.withdraw': {
    methods: ["POST"]
    pattern: '/api/v1/parking/applications/:id/withdraw'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['withdraw']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['withdraw']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['withdraw']>>>
    }
  }
  'parking.manage.applications.assign': {
    methods: ["POST"]
    pattern: '/api/v1/parking/applications/:id/assign'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/parking').assignApplicationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/property/parking').assignApplicationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['assign']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['assign']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/parking_lotteries_controller').default['assign']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'reports.options': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/reports/options'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reports/reports_controller').default['options']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reports/reports_controller').default['options']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/reports/reports_controller').default['options']>>>
    }
  }
  'reports.export': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/reports/:key/export'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { key: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reports/reports_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reports/reports_controller').default['export']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/reports/reports_controller').default['export']>>>
    }
  }
  'reports.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/reports/:key'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { key: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reports/reports_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reports/reports_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/reports/reports_controller').default['show']>>>
    }
  }
  'auditLogs.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/audit-logs'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/audit/audit').auditListValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/audit/audit_logs_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/audit/audit_logs_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/audit/audit_logs_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auditLogs.export': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/audit-logs/export'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/audit/audit').auditExportValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/audit/audit_logs_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/audit/audit_logs_controller').default['export']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/audit/audit_logs_controller').default['export']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auditLogs.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/audit-logs/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/audit/audit_logs_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/audit/audit_logs_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/audit/audit_logs_controller').default['show']>>>
    }
  }
  'billing.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/billing'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['show']>>>
    }
  }
  'billing.config': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/billing/config'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['config']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['config']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['config']>>>
    }
  }
  'billing.charges.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/billing/charges/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['charge']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['charge']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['charge']>>>
    }
  }
  'billing.tokens.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/billing/tokens/:type/:tokenId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { type: ParamValue; tokenId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['tokenStatus']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['tokenStatus']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['tokenStatus']>>>
    }
  }
  'billing.autoRenew': {
    methods: ["PUT"]
    pattern: '/api/v1/billing/subscription/auto-renew'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/billing/billing').autoRenewValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/billing/billing').autoRenewValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['autoRenew']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['autoRenew']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['autoRenew']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'billing.paymentMethod.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/billing/payment-method'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['removePaymentMethod']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['removePaymentMethod']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['removePaymentMethod']>>>
    }
  }
  'billing.paymentMethod.save': {
    methods: ["PUT"]
    pattern: '/api/v1/billing/payment-method'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/billing/billing').paymentMethodValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/billing/billing').paymentMethodValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['savePaymentMethod']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['savePaymentMethod']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['savePaymentMethod']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'billing.tokens.nequi': {
    methods: ["POST"]
    pattern: '/api/v1/billing/tokens/nequi'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/billing/billing').nequiTokenValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/billing/billing').nequiTokenValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['nequiToken']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['nequiToken']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['nequiToken']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'billing.tokens.daviplata': {
    methods: ["POST"]
    pattern: '/api/v1/billing/tokens/daviplata'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/billing/billing').daviplataTokenValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/billing/billing').daviplataTokenValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['daviplataToken']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['daviplataToken']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['daviplataToken']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'billing.tokens.daviplataOtp': {
    methods: ["POST"]
    pattern: '/api/v1/billing/tokens/daviplata/otp'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/billing/billing').daviplataOtpValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/billing/billing').daviplataOtpValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['daviplataOtp']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['daviplataOtp']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['daviplataOtp']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'billing.tokens.bancolombia': {
    methods: ["POST"]
    pattern: '/api/v1/billing/tokens/bancolombia'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['bancolombiaToken']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['bancolombiaToken']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['bancolombiaToken']>>>
    }
  }
  'billing.pay': {
    methods: ["POST"]
    pattern: '/api/v1/billing/subscription/pay'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['paySubscription']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['paySubscription']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing/subscription_billing_controller').default['paySubscription']>>>
    }
  }
  'billing.emailPacks': {
    methods: ["POST"]
    pattern: '/api/v1/email-quota/packs'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/billing/billing').emailPacksValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/billing/billing').emailPacksValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/email_quota_controller').default['buy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/email_quota_controller').default['buy']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/email_quota_controller').default['buy']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'webhooks.wompi': {
    methods: ["POST"]
    pattern: '/api/v1/webhooks/wompi'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing/wompi_controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing/wompi_controller').default['handle']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/billing/wompi_controller').default['handle']>>>
    }
  }
  'public.clearances.verify': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/public/clearances/:code'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { code: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/reconciliation').verifyClearanceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/clearances_controller').default['verify']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/clearances_controller').default['verify']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/clearances_controller').default['verify']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'public.announcementImages.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/public/announcement-images/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/announcements/announcement_images_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/announcements/announcement_images_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/announcements/announcement_images_controller').default['show']>>>
    }
  }
  'buildings.store': {
    methods: ["POST"]
    pattern: '/api/v1/buildings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/building').createBuildingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/property/building').createBuildingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/buildings_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/buildings_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/buildings_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'buildings.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/buildings/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/building').updateBuildingValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/property/building').updateBuildingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/buildings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/buildings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/buildings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'buildings.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/buildings/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/buildings_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/buildings_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/buildings_controller').default['destroy']>>>
    }
  }
  'units.store': {
    methods: ["POST"]
    pattern: '/api/v1/units'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/unit').createUnitValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/property/unit').createUnitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/units_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/units_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/units_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'units.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/units/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/unit').updateUnitValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/property/unit').updateUnitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/units_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/units_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/units_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'units.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/units/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/units_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/units_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/units_controller').default['destroy']>>>
    }
  }
  'occupants.store': {
    methods: ["POST"]
    pattern: '/api/v1/units/:unitId/occupants'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/unit_occupant').createUnitOccupantValidator)>>
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/property/unit_occupant').createUnitOccupantValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/unit_occupants_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/unit_occupants_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/unit_occupants_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'occupants.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/units/:unitId/occupants/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/unit_occupant').updateUnitOccupantValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { unitId: ParamValue; id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/property/unit_occupant').updateUnitOccupantValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/unit_occupants_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/unit_occupants_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/unit_occupants_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'occupants.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/units/:unitId/occupants/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { unitId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/unit_occupants_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/unit_occupants_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/unit_occupants_controller').default['destroy']>>>
    }
  }
  'imports.property.preview': {
    methods: ["POST"]
    pattern: '/api/v1/imports/property/preview'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/import').importFileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/property/import').importFileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/property_import_controller').default['preview']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/property_import_controller').default['preview']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/property_import_controller').default['preview']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'imports.property.plan': {
    methods: ["POST"]
    pattern: '/api/v1/imports/property/plan'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/import').importPlanValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/property/import').importPlanValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/property_import_controller').default['plan']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/property_import_controller').default['plan']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/property_import_controller').default['plan']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'imports.property.apply': {
    methods: ["POST"]
    pattern: '/api/v1/imports/property/rows'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/property/import').importRowValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/property/import').importRowValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/property/property_import_controller').default['apply']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/property/property_import_controller').default['apply']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/property/property_import_controller').default['apply']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'members.store': {
    methods: ["POST"]
    pattern: '/api/v1/members'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/tenants/member').inviteMemberValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/tenants/member').inviteMemberValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tenants/members_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tenants/members_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tenants/members_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'members.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/members/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/tenants/member').updateMemberValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/tenants/member').updateMemberValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tenants/members_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tenants/members_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tenants/members_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'members.status': {
    methods: ["PATCH"]
    pattern: '/api/v1/members/:id/status'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/tenants/member').changeMemberStatusValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/tenants/member').changeMemberStatusValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tenants/members_controller').default['changeStatus']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tenants/members_controller').default['changeStatus']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tenants/members_controller').default['changeStatus']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'members.invitation': {
    methods: ["POST"]
    pattern: '/api/v1/members/:id/invitation'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tenants/members_controller').default['resendInvitation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tenants/members_controller').default['resendInvitation']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tenants/members_controller').default['resendInvitation']>>>
    }
  }
  'settings.tenant.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/settings/tenant'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tenants/tenant_settings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tenants/tenant_settings_controller').default['update']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/tenants/tenant_settings_controller').default['update']>>>
    }
  }
  'finance.summary': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/summary'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/overview_controller').default['summary']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/overview_controller').default['summary']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/overview_controller').default['summary']>>>
    }
  }
  'finance.settings': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/settings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/overview_controller').default['settings']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/overview_controller').default['settings']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/overview_controller').default['settings']>>>
    }
  }
  'finance.accounts.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/accounts'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/finance').listAccountsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.concepts.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/concepts'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['concepts']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['concepts']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['concepts']>>>
    }
  }
  'finance.cash.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/cash-accounts'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['index']>>>
    }
  }
  'finance.periods.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/periods'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['periods']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['periods']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['periods']>>>
    }
  }
  'finance.periods.preview': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/periods/preview'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/finance').periodValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['preview']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['preview']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['preview']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.periods.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/periods/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['showPeriod']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['showPeriod']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['showPeriod']>>>
    }
  }
  'finance.charges.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/charges'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/finance').listChargesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['charges']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['charges']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['charges']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.charges.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/charges/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['showCharge']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['showCharge']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['showCharge']>>>
    }
  }
  'finance.recurring.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/recurring-charges'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/finance').listRecurringValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['recurring']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['recurring']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['recurring']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.schedules.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/fee-schedules'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['schedules']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['schedules']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['schedules']>>>
    }
  }
  'finance.modules.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/modules'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['modules']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['modules']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['modules']>>>
    }
  }
  'finance.payments.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/payments'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/finance').listPaymentsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.payments.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/payments/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['show']>>>
    }
  }
  'finance.payments.receipt': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/payments/:id/receipt'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/clearances_controller').default['receipt']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/clearances_controller').default['receipt']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/clearances_controller').default['receipt']>>>
    }
  }
  'finance.units.clearance': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/units/:unitId/clearance'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/clearances_controller').default['status']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/clearances_controller').default['status']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/clearances_controller').default['status']>>>
    }
  }
  'finance.clearances.pdf': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/clearances/:id/pdf'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/clearances_controller').default['pdf']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/clearances_controller').default['pdf']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/clearances_controller').default['pdf']>>>
    }
  }
  'finance.statements.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/bank-statements'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/reconciliation').listStatementsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.statements.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/bank-statements/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['show']>>>
    }
  }
  'finance.vendors.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/vendors'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/finance').listVendorsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['vendors']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['vendors']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['vendors']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.vendors.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/vendors/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['showVendor']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['showVendor']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['showVendor']>>>
    }
  }
  'finance.bills.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/bills'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/finance').listBillsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['bills']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['bills']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['bills']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.bills.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/bills/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['showBill']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['showBill']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['showBill']>>>
    }
  }
  'finance.egresos.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/vendor-payments'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/finance').listVendorPaymentsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['payments']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['payments']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['payments']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.egresos.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/vendor-payments/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['showPayment']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['showPayment']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['showPayment']>>>
    }
  }
  'finance.budgets.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/budgets'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['index']>>>
    }
  }
  'finance.budgets.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/budgets/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['show']>>>
    }
  }
  'finance.journal.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/journal'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/finance').listJournalValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['journal']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['journal']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['journal']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.journal.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/journal/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['showEntry']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['showEntry']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['showEntry']>>>
    }
  }
  'finance.units.statement': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/units/:unitId/statement'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/finance').statementValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['statement']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['statement']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['statement']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.aging.receivables': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/aging/receivables'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['receivables']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['receivables']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['receivables']>>>
    }
  }
  'finance.aging.payables': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/aging/payables'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['payables']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['payables']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['payables']>>>
    }
  }
  'finance.reports.trialBalance': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/reports/trial-balance'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/finance').rangeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['trialBalance']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['trialBalance']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['trialBalance']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.reports.incomeStatement': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/reports/income-statement'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/finance').rangeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['incomeStatement']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['incomeStatement']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['incomeStatement']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.reports.balanceSheet': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/reports/balance-sheet'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/finance').rangeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['balanceSheet']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['balanceSheet']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['balanceSheet']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.reports.ledger': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/reports/ledger'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance/finance').ledgerReportValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['ledger']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['ledger']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['ledger']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.attachments.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/attachments/:ownerType/:ownerId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { ownerType: ParamValue; ownerId: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/files/attachment').attachmentOwnerValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/attachments_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/attachments_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/attachments_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.attachments.url': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/attachments/:id/url'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/files/attachment').attachmentUrlValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/attachments_controller').default['url']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/attachments_controller').default['url']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/attachments_controller').default['url']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.settings.update': {
    methods: ["PUT"]
    pattern: '/api/v1/finance/settings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').financeSettingsValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').financeSettingsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/overview_controller').default['updateSettings']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/overview_controller').default['updateSettings']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/overview_controller').default['updateSettings']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.accounts.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/accounts'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').ledgerAccountValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').ledgerAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.accounts.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/finance/accounts/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').updateLedgerAccountValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').updateLedgerAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.concepts.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/concepts'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').conceptValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').conceptValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['storeConcept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['storeConcept']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['storeConcept']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.concepts.update': {
    methods: ["PUT"]
    pattern: '/api/v1/finance/concepts/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').conceptValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').conceptValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['updateConcept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['updateConcept']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['updateConcept']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.cash.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/cash-accounts'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').cashAccountValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').cashAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.cash.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/finance/cash-accounts/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').updateCashAccountValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').updateCashAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.transfers.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/transfers'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').transferValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').transferValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['transfer']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['transfer']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['transfer']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.periods.generate': {
    methods: ["POST"]
    pattern: '/api/v1/finance/periods/generate'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').periodValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').periodValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['generate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['generate']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['generate']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.periods.close': {
    methods: ["POST"]
    pattern: '/api/v1/finance/periods/:id/close'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['close']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['close']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['close']>>>
    }
  }
  'finance.write.periods.reopen': {
    methods: ["POST"]
    pattern: '/api/v1/finance/periods/:id/reopen'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['reopen']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['reopen']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['reopen']>>>
    }
  }
  'finance.write.charges.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/charges'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').createChargeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').createChargeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['storeCharges']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['storeCharges']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['storeCharges']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.charges.cancel': {
    methods: ["POST"]
    pattern: '/api/v1/finance/charges/:id/cancel'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['cancelCharge']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['cancelCharge']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['cancelCharge']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.charges.creditNote': {
    methods: ["POST"]
    pattern: '/api/v1/finance/charges/:id/credit-note'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').creditNoteValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').creditNoteValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['creditNote']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['creditNote']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['creditNote']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.recurring.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/recurring-charges'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').recurringChargeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').recurringChargeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['storeRecurring']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['storeRecurring']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['storeRecurring']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.recurring.end': {
    methods: ["POST"]
    pattern: '/api/v1/finance/recurring-charges/:id/end'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').endRecurringValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').endRecurringValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['endRecurring']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['endRecurring']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['endRecurring']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.schedules.preview': {
    methods: ["POST"]
    pattern: '/api/v1/finance/fee-schedules/preview'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').feeScheduleValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').feeScheduleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['previewSchedule']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['previewSchedule']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['previewSchedule']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.schedules.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/fee-schedules'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').feeScheduleValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').feeScheduleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['applySchedule']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['applySchedule']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['applySchedule']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.modules.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/modules'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').contributionModuleValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').contributionModuleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['storeModule']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['storeModule']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['storeModule']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.modules.update': {
    methods: ["PUT"]
    pattern: '/api/v1/finance/modules/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').contributionModuleValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').contributionModuleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['updateModule']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['updateModule']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['updateModule']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.modules.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/finance/modules/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['destroyModule']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['destroyModule']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['destroyModule']>>>
    }
  }
  'finance.write.payments.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/payments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').registerPaymentValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').registerPaymentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.payments.confirm': {
    methods: ["POST"]
    pattern: '/api/v1/finance/payments/:id/confirm'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').confirmPaymentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').confirmPaymentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['confirm']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['confirm']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['confirm']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.payments.reject': {
    methods: ["POST"]
    pattern: '/api/v1/finance/payments/:id/reject'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['reject']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['reject']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['reject']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.payments.reverse': {
    methods: ["POST"]
    pattern: '/api/v1/finance/payments/:id/reverse'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['reverse']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['reverse']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['reverse']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.clearances.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/units/:unitId/clearances'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/clearances_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/clearances_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/clearances_controller').default['store']>>>
    }
  }
  'finance.write.statements.preview': {
    methods: ["POST"]
    pattern: '/api/v1/finance/bank-statements/preview'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/reconciliation').statementPreviewValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/reconciliation').statementPreviewValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['preview']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['preview']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['preview']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.statements.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/bank-statements'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/reconciliation').statementImportValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/reconciliation').statementImportValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.statements.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/finance/bank-statements/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['destroy']>>>
    }
  }
  'finance.write.statements.applySuggestions': {
    methods: ["POST"]
    pattern: '/api/v1/finance/bank-statements/:id/apply-suggestions'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['applySuggestions']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['applySuggestions']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['applySuggestions']>>>
    }
  }
  'finance.write.statementLines.reconcile': {
    methods: ["POST"]
    pattern: '/api/v1/finance/bank-statement-lines/:id/reconcile'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/reconciliation').reconcileValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/reconciliation').reconcileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['reconcile']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['reconcile']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['reconcile']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.statementLines.undo': {
    methods: ["POST"]
    pattern: '/api/v1/finance/bank-statement-lines/:id/undo'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['undo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['undo']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/reconciliation_controller').default['undo']>>>
    }
  }
  'finance.write.vendors.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/vendors'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').vendorValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').vendorValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storeVendor']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storeVendor']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storeVendor']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.vendors.update': {
    methods: ["PUT"]
    pattern: '/api/v1/finance/vendors/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').vendorValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').vendorValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['updateVendor']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['updateVendor']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['updateVendor']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.bills.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/bills'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').billValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').billValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storeBill']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storeBill']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storeBill']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.bills.cancel': {
    methods: ["POST"]
    pattern: '/api/v1/finance/bills/:id/cancel'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['cancelBill']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['cancelBill']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['cancelBill']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.egresos.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/vendor-payments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').vendorPaymentValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').vendorPaymentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storePayment']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storePayment']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storePayment']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.egresos.reverse': {
    methods: ["POST"]
    pattern: '/api/v1/finance/vendor-payments/:id/reverse'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['reversePayment']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['reversePayment']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['reversePayment']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.budgets.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/budgets'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').budgetValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').budgetValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.budgets.update': {
    methods: ["PUT"]
    pattern: '/api/v1/finance/budgets/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').budgetValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').budgetValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.budgets.approve': {
    methods: ["POST"]
    pattern: '/api/v1/finance/budgets/:id/approve'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').approveBudgetValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').approveBudgetValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['approve']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['approve']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['approve']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.budgets.reopen': {
    methods: ["POST"]
    pattern: '/api/v1/finance/budgets/:id/reopen'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['reopen']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['reopen']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['reopen']>>>
    }
  }
  'finance.write.budgets.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/finance/budgets/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['destroy']>>>
    }
  }
  'finance.write.journal.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/journal'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').manualEntryValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').manualEntryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['storeEntry']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['storeEntry']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['storeEntry']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.journal.reverse': {
    methods: ["POST"]
    pattern: '/api/v1/finance/journal/:id/reverse'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance/finance').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance/finance').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['reverseEntry']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['reverseEntry']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['reverseEntry']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.attachments.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/attachments/:ownerType/:ownerId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/files/attachment').uploadAttachmentValidator)>|InferInput<(typeof import('#validators/files/attachment').attachmentOwnerValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { ownerType: ParamValue; ownerId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/files/attachment').uploadAttachmentValidator)>|InferInput<(typeof import('#validators/files/attachment').attachmentOwnerValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/attachments_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/attachments_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/attachments_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.attachments.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/finance/attachments/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/attachments_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/attachments_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/attachments_controller').default['destroy']>>>
    }
  }
}

export namespace Route {
  export type Request<Name extends keyof typeof routes> = RouteWithRegistry.Request<typeof routes, Name>
  export type Response<Name extends keyof typeof routes> = RouteWithRegistry.Response<typeof routes, Name>
  export type Params<Name extends keyof typeof routes> = RouteWithRegistry.Params<typeof routes, Name>
  export type Body<Name extends keyof typeof routes> = RouteWithRegistry.Body<typeof routes, Name>
  export type Query<Name extends keyof typeof routes> = RouteWithRegistry.Query<typeof routes, Name>
  export type Error<Name extends keyof typeof routes> = RouteWithRegistry.Error<typeof routes, Name>
}

export namespace Path {
  export type Request<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Request<typeof routes, M, P>
  export type Response<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Response<typeof routes, M, P>
  export type Params<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Params<typeof routes, M, P>
  export type Body<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Body<typeof routes, M, P>
  export type Query<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Query<typeof routes, M, P>
  export type Error<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Error<typeof routes, M, P>
}
