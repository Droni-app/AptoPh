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
      body: ExtractBody<InferInput<(typeof import('#validators/auth').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['login']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['login']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['login']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.signup': {
    methods: ["POST"]
    pattern: '/api/v1/auth/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/signup').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/signup').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['signup']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['signup']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['signup']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['logout']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['logout']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['logout']>>>
    }
  }
  'auth.password.forgot': {
    methods: ["POST"]
    pattern: '/api/v1/auth/password/forgot'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').forgotPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account').forgotPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['forgotPassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['forgotPassword']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['forgotPassword']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.password.reset': {
    methods: ["POST"]
    pattern: '/api/v1/auth/password/reset'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').resetPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account').resetPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['resetPassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['resetPassword']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['resetPassword']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.email.verify': {
    methods: ["POST"]
    pattern: '/api/v1/auth/email/verify'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').verifyEmailValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account').verifyEmailValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['verifyEmail']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['verifyEmail']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['verifyEmail']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invitations_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invitations_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/invitations_controller').default['show']>>>
    }
  }
  'invitations.accept': {
    methods: ["POST"]
    pattern: '/api/v1/invitations/accept'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').acceptInvitationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account').acceptInvitationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invitations_controller').default['accept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invitations_controller').default['accept']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/invitations_controller').default['accept']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/account/profile'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').updateProfileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account').updateProfileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_controller').default['updateProfile']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_controller').default['updateProfile']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/account_controller').default['updateProfile']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.password': {
    methods: ["PUT"]
    pattern: '/api/v1/account/password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').changePasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account').changePasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_controller').default['changePassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_controller').default['changePassword']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/account_controller').default['changePassword']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_controller').default['sessions']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_controller').default['sessions']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/account_controller').default['sessions']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_controller').default['destroySession']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_controller').default['destroySession']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/account_controller').default['destroySession']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_controller').default['destroyOtherSessions']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_controller').default['destroyOtherSessions']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/account_controller').default['destroyOtherSessions']>>>
    }
  }
  'profile.email.verification': {
    methods: ["POST"]
    pattern: '/api/v1/account/email/verification'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').sendVerificationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account').sendVerificationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_controller').default['sendVerification']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_controller').default['sendVerification']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/account_controller').default['sendVerification']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/my_tenants_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/my_tenants_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/my_tenants_controller').default['index']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/my_tenants_controller').default['current']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/my_tenants_controller').default['current']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/my_tenants_controller').default['current']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/home_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/home_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/home_controller').default['show']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/units_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/units_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/units_controller').default['show']>>>
    }
  }
  'resident.vehicles.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/units/:unitId/vehicles'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/resident').createVehicleValidator)>>
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/resident').createVehicleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/vehicles_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/vehicles_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/vehicles_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.vehicles.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/resident/vehicles/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/resident').updateVehicleValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/resident').updateVehicleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/vehicles_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/vehicles_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/vehicles_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/vehicles_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/vehicles_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/vehicles_controller').default['destroy']>>>
    }
  }
  'resident.pets.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/units/:unitId/pets'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/resident').createPetValidator)>>
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/resident').createPetValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/pets_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/pets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/pets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.pets.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/resident/pets/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/resident').updatePetValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/resident').updatePetValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/pets_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/pets_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/pets_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/pets_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/pets_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/pets_controller').default['destroy']>>>
    }
  }
  'resident.household.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/units/:unitId/household'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/resident').createHouseholdMemberValidator)>>
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/resident').createHouseholdMemberValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/household_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/household_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/household_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.household.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/resident/household/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/resident').updateHouseholdMemberValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/resident').updateHouseholdMemberValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/household_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/household_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/household_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/household_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/household_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/household_controller').default['destroy']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/visits_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/visits_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/visits_controller').default['index']>>>
    }
  }
  'resident.visits.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/visits'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/resident').createVisitValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/resident').createVisitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/visits_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/visits_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/visits_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/visits_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/visits_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/visits_controller').default['destroy']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/parcels_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/parcels_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/parcels_controller').default['index']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/bookings_controller').default['amenities']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/bookings_controller').default['amenities']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/bookings_controller').default['amenities']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/bookings_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/bookings_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/bookings_controller').default['index']>>>
    }
  }
  'resident.bookings.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/bookings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/resident').createBookingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/resident').createBookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/bookings_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/bookings_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/bookings_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.bookings.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/resident/bookings/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/bookings_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/bookings_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/bookings_controller').default['destroy']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/tickets_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/tickets_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/tickets_controller').default['index']>>>
    }
  }
  'resident.tickets.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/tickets'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/resident').createTicketValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/resident').createTicketValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/tickets_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/tickets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/tickets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/tickets_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/tickets_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/tickets_controller').default['show']>>>
    }
  }
  'resident.tickets.comments.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/tickets/:id/comments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/resident').createTicketCommentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/resident').createTicketCommentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/tickets_controller').default['comment']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/tickets_controller').default['comment']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/tickets_controller').default['comment']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.statement': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/units/:unitId/statement'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance').statementValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['statement']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['statement']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['statement']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.payments.report': {
    methods: ["POST"]
    pattern: '/api/v1/resident/units/:unitId/payments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').reportPaymentValidator)>>
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').reportPaymentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['report']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['report']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['report']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['payments']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['payments']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['payments']>>>
    }
  }
  'resident.payments.attachments.store': {
    methods: ["POST"]
    pattern: '/api/v1/resident/payments/:id/attachments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/attachment').uploadAttachmentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/attachment').uploadAttachmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['attach']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['attach']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['attach']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'resident.attachments.url': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/resident/attachments/:id/url'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/attachment').attachmentUrlValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['attachmentUrl']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['attachmentUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['attachmentUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['detach']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['detach']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/resident/finance_controller').default['detach']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/dashboard_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/dashboard_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/dashboard_controller').default['show']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/buildings_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/buildings_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/buildings_controller').default['index']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/buildings_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/buildings_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/buildings_controller').default['show']>>>
    }
  }
  'units.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/units'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/unit').listUnitsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/units_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/units_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/units_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/units_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/units_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/units_controller').default['show']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/unit_occupants_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/unit_occupants_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/unit_occupants_controller').default['index']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/members_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/members_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/members_controller').default['index']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/subscription_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/subscription_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/subscription_controller').default['show']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/tenant_settings_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/tenant_settings_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/tenant_settings_controller').default['show']>>>
    }
  }
  'subscription.activation': {
    methods: ["POST"]
    pattern: '/api/v1/subscription/activation'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/subscription').activationRequestValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/subscription').activationRequestValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/subscription_controller').default['requestActivation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/subscription_controller').default['requestActivation']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/subscription_controller').default['requestActivation']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'buildings.store': {
    methods: ["POST"]
    pattern: '/api/v1/buildings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/building').createBuildingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/building').createBuildingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/buildings_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/buildings_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/buildings_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'buildings.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/buildings/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/building').updateBuildingValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/building').updateBuildingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/buildings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/buildings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/buildings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/buildings_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/buildings_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/buildings_controller').default['destroy']>>>
    }
  }
  'units.store': {
    methods: ["POST"]
    pattern: '/api/v1/units'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/unit').createUnitValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/unit').createUnitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/units_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/units_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/units_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'units.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/units/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/unit').updateUnitValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/unit').updateUnitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/units_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/units_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/units_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/units_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/units_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/units_controller').default['destroy']>>>
    }
  }
  'occupants.store': {
    methods: ["POST"]
    pattern: '/api/v1/units/:unitId/occupants'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/unit_occupant').createUnitOccupantValidator)>>
      paramsTuple: [ParamValue]
      params: { unitId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/unit_occupant').createUnitOccupantValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/unit_occupants_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/unit_occupants_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/unit_occupants_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'occupants.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/units/:unitId/occupants/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/unit_occupant').updateUnitOccupantValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { unitId: ParamValue; id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/unit_occupant').updateUnitOccupantValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/unit_occupants_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/unit_occupants_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/unit_occupants_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/unit_occupants_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/unit_occupants_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/unit_occupants_controller').default['destroy']>>>
    }
  }
  'members.store': {
    methods: ["POST"]
    pattern: '/api/v1/members'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/member').inviteMemberValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/member').inviteMemberValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/members_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/members_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/members_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'members.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/members/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/member').updateMemberValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/member').updateMemberValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/members_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/members_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/members_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'members.status': {
    methods: ["PATCH"]
    pattern: '/api/v1/members/:id/status'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/member').changeMemberStatusValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/member').changeMemberStatusValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/members_controller').default['changeStatus']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/members_controller').default['changeStatus']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/members_controller').default['changeStatus']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/members_controller').default['resendInvitation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/members_controller').default['resendInvitation']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/members_controller').default['resendInvitation']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/backoffice/tenant_settings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/backoffice/tenant_settings_controller').default['update']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/backoffice/tenant_settings_controller').default['update']>>>
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
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance').listAccountsValidator)>>
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
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance').periodValidator)>>
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
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance').listChargesValidator)>>
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
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance').listRecurringValidator)>>
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
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance').listPaymentsValidator)>>
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
  'finance.vendors.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/finance/vendors'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance').listVendorsValidator)>>
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
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance').listBillsValidator)>>
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
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance').listVendorPaymentsValidator)>>
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
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance').listJournalValidator)>>
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
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance').statementValidator)>>
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
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance').rangeValidator)>>
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
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance').rangeValidator)>>
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
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance').rangeValidator)>>
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
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/finance').ledgerReportValidator)>>
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
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/attachment').attachmentOwnerValidator)>>
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
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/attachment').attachmentUrlValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/attachments_controller').default['url']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/attachments_controller').default['url']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/attachments_controller').default['url']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.settings.update': {
    methods: ["PUT"]
    pattern: '/api/v1/finance/settings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').financeSettingsValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').financeSettingsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/overview_controller').default['updateSettings']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/overview_controller').default['updateSettings']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/overview_controller').default['updateSettings']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.accounts.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/accounts'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').ledgerAccountValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').ledgerAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.accounts.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/finance/accounts/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').updateLedgerAccountValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').updateLedgerAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.concepts.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/concepts'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').conceptValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').conceptValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['storeConcept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['storeConcept']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['storeConcept']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.concepts.update': {
    methods: ["PUT"]
    pattern: '/api/v1/finance/concepts/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').conceptValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').conceptValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['updateConcept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['updateConcept']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounts_controller').default['updateConcept']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.cash.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/cash-accounts'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').cashAccountValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').cashAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.cash.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/finance/cash-accounts/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').updateCashAccountValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').updateCashAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.transfers.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/transfers'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').transferValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').transferValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['transfer']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['transfer']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/cash_accounts_controller').default['transfer']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.periods.generate': {
    methods: ["POST"]
    pattern: '/api/v1/finance/periods/generate'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').periodValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').periodValidator)>>
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
      body: ExtractBody<InferInput<(typeof import('#validators/finance').createChargeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').createChargeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['storeCharges']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['storeCharges']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['storeCharges']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.charges.cancel': {
    methods: ["POST"]
    pattern: '/api/v1/finance/charges/:id/cancel'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['cancelCharge']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['cancelCharge']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['cancelCharge']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.charges.creditNote': {
    methods: ["POST"]
    pattern: '/api/v1/finance/charges/:id/credit-note'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').creditNoteValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').creditNoteValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['creditNote']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['creditNote']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/billing_controller').default['creditNote']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.recurring.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/recurring-charges'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').recurringChargeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').recurringChargeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['storeRecurring']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['storeRecurring']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['storeRecurring']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.recurring.end': {
    methods: ["POST"]
    pattern: '/api/v1/finance/recurring-charges/:id/end'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').endRecurringValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').endRecurringValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['endRecurring']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['endRecurring']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['endRecurring']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.schedules.preview': {
    methods: ["POST"]
    pattern: '/api/v1/finance/fee-schedules/preview'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').feeScheduleValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').feeScheduleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['previewSchedule']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['previewSchedule']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['previewSchedule']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.schedules.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/fee-schedules'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').feeScheduleValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').feeScheduleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['applySchedule']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['applySchedule']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['applySchedule']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.modules.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/modules'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').contributionModuleValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').contributionModuleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['storeModule']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['storeModule']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/fees_controller').default['storeModule']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.modules.update': {
    methods: ["PUT"]
    pattern: '/api/v1/finance/modules/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').contributionModuleValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').contributionModuleValidator)>>
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
      body: ExtractBody<InferInput<(typeof import('#validators/finance').registerPaymentValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').registerPaymentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.payments.confirm': {
    methods: ["POST"]
    pattern: '/api/v1/finance/payments/:id/confirm'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').confirmPaymentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').confirmPaymentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['confirm']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['confirm']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['confirm']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.payments.reject': {
    methods: ["POST"]
    pattern: '/api/v1/finance/payments/:id/reject'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['reject']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['reject']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['reject']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.payments.reverse': {
    methods: ["POST"]
    pattern: '/api/v1/finance/payments/:id/reverse'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['reverse']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['reverse']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payments_controller').default['reverse']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.vendors.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/vendors'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').vendorValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').vendorValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storeVendor']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storeVendor']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storeVendor']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.vendors.update': {
    methods: ["PUT"]
    pattern: '/api/v1/finance/vendors/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').vendorValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').vendorValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['updateVendor']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['updateVendor']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['updateVendor']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.bills.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/bills'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').billValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').billValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storeBill']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storeBill']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storeBill']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.bills.cancel': {
    methods: ["POST"]
    pattern: '/api/v1/finance/bills/:id/cancel'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['cancelBill']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['cancelBill']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['cancelBill']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.egresos.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/vendor-payments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').vendorPaymentValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').vendorPaymentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storePayment']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storePayment']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['storePayment']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.egresos.reverse': {
    methods: ["POST"]
    pattern: '/api/v1/finance/vendor-payments/:id/reverse'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['reversePayment']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['reversePayment']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/payables_controller').default['reversePayment']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.budgets.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/budgets'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').budgetValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').budgetValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.budgets.update': {
    methods: ["PUT"]
    pattern: '/api/v1/finance/budgets/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').budgetValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').budgetValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/budgets_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.budgets.approve': {
    methods: ["POST"]
    pattern: '/api/v1/finance/budgets/:id/approve'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').approveBudgetValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').approveBudgetValidator)>>
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
      body: ExtractBody<InferInput<(typeof import('#validators/finance').manualEntryValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').manualEntryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['storeEntry']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['storeEntry']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['storeEntry']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.journal.reverse': {
    methods: ["POST"]
    pattern: '/api/v1/finance/journal/:id/reverse'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finance').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finance').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['reverseEntry']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['reverseEntry']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/finance/accounting_controller').default['reverseEntry']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'finance.write.attachments.store': {
    methods: ["POST"]
    pattern: '/api/v1/finance/attachments/:ownerType/:ownerId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/attachment').uploadAttachmentValidator)>|InferInput<(typeof import('#validators/attachment').attachmentOwnerValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { ownerType: ParamValue; ownerId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/attachment').uploadAttachmentValidator)>|InferInput<(typeof import('#validators/attachment').attachmentOwnerValidator)>>
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
