/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractRawResponse, ExtractResponse, Method, PathWithRegistry, PatternsByMethod, RouteWithRegistry } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'
import type { routes } from './index.ts'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
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
