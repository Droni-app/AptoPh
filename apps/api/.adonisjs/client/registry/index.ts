/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

export type { Route, Path } from './schema.d.ts'

const placeholder: any = {}

const routes = {
  'auth.login': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"login"]],
    types: placeholder as Registry['auth.login']['types'],
  },
  'auth.signup': {
    methods: ["POST"],
    pattern: '/api/v1/auth/signup',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"signup"]],
    types: placeholder as Registry['auth.signup']['types'],
  },
  'auth.logout': {
    methods: ["POST"],
    pattern: '/api/v1/auth/logout',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"logout"]],
    types: placeholder as Registry['auth.logout']['types'],
  },
  'auth.password.forgot': {
    methods: ["POST"],
    pattern: '/api/v1/auth/password/forgot',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"password"],[0,"forgot"]],
    types: placeholder as Registry['auth.password.forgot']['types'],
  },
  'auth.password.reset': {
    methods: ["POST"],
    pattern: '/api/v1/auth/password/reset',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"password"],[0,"reset"]],
    types: placeholder as Registry['auth.password.reset']['types'],
  },
  'auth.email.verify': {
    methods: ["POST"],
    pattern: '/api/v1/auth/email/verify',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"email"],[0,"verify"]],
    types: placeholder as Registry['auth.email.verify']['types'],
  },
  'invitations.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/invitations/:token',
    tokens: [[0,"api"],[0,"v1"],[0,"invitations"],[1,"token"]],
    types: placeholder as Registry['invitations.show']['types'],
  },
  'invitations.accept': {
    methods: ["POST"],
    pattern: '/api/v1/invitations/accept',
    tokens: [[0,"api"],[0,"v1"],[0,"invitations"],[0,"accept"]],
    types: placeholder as Registry['invitations.accept']['types'],
  },
  'profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"profile"]],
    types: placeholder as Registry['profile.show']['types'],
  },
  'profile.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/account/profile',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"profile"]],
    types: placeholder as Registry['profile.update']['types'],
  },
  'profile.password': {
    methods: ["PUT"],
    pattern: '/api/v1/account/password',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"password"]],
    types: placeholder as Registry['profile.password']['types'],
  },
  'profile.sessions.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/sessions',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"sessions"]],
    types: placeholder as Registry['profile.sessions.index']['types'],
  },
  'profile.sessions.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/account/sessions/:sessionId',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"sessions"],[1,"sessionId"]],
    types: placeholder as Registry['profile.sessions.destroy']['types'],
  },
  'profile.sessions.destroyOthers': {
    methods: ["DELETE"],
    pattern: '/api/v1/account/sessions',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"sessions"]],
    types: placeholder as Registry['profile.sessions.destroyOthers']['types'],
  },
  'profile.email.verification': {
    methods: ["POST"],
    pattern: '/api/v1/account/email/verification',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"email"],[0,"verification"]],
    types: placeholder as Registry['profile.email.verification']['types'],
  },
  'profile.tenants': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/tenants',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"tenants"]],
    types: placeholder as Registry['profile.tenants']['types'],
  },
  'tenant.current': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/tenant',
    tokens: [[0,"api"],[0,"v1"],[0,"tenant"]],
    types: placeholder as Registry['tenant.current']['types'],
  },
  'resident.home': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/resident/home',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"home"]],
    types: placeholder as Registry['resident.home']['types'],
  },
  'resident.units.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/resident/units/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"units"],[1,"id"]],
    types: placeholder as Registry['resident.units.show']['types'],
  },
  'resident.vehicles.store': {
    methods: ["POST"],
    pattern: '/api/v1/resident/units/:unitId/vehicles',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"units"],[1,"unitId"],[0,"vehicles"]],
    types: placeholder as Registry['resident.vehicles.store']['types'],
  },
  'resident.vehicles.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/resident/vehicles/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"vehicles"],[1,"id"]],
    types: placeholder as Registry['resident.vehicles.update']['types'],
  },
  'resident.vehicles.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/resident/vehicles/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"vehicles"],[1,"id"]],
    types: placeholder as Registry['resident.vehicles.destroy']['types'],
  },
  'resident.pets.store': {
    methods: ["POST"],
    pattern: '/api/v1/resident/units/:unitId/pets',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"units"],[1,"unitId"],[0,"pets"]],
    types: placeholder as Registry['resident.pets.store']['types'],
  },
  'resident.pets.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/resident/pets/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"pets"],[1,"id"]],
    types: placeholder as Registry['resident.pets.update']['types'],
  },
  'resident.pets.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/resident/pets/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"pets"],[1,"id"]],
    types: placeholder as Registry['resident.pets.destroy']['types'],
  },
  'resident.household.store': {
    methods: ["POST"],
    pattern: '/api/v1/resident/units/:unitId/household',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"units"],[1,"unitId"],[0,"household"]],
    types: placeholder as Registry['resident.household.store']['types'],
  },
  'resident.household.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/resident/household/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"household"],[1,"id"]],
    types: placeholder as Registry['resident.household.update']['types'],
  },
  'resident.household.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/resident/household/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"household"],[1,"id"]],
    types: placeholder as Registry['resident.household.destroy']['types'],
  },
  'resident.visits.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/resident/visits',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"visits"]],
    types: placeholder as Registry['resident.visits.index']['types'],
  },
  'resident.visits.store': {
    methods: ["POST"],
    pattern: '/api/v1/resident/visits',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"visits"]],
    types: placeholder as Registry['resident.visits.store']['types'],
  },
  'resident.visits.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/resident/visits/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"visits"],[1,"id"]],
    types: placeholder as Registry['resident.visits.destroy']['types'],
  },
  'resident.parcels.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/resident/parcels',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"parcels"]],
    types: placeholder as Registry['resident.parcels.index']['types'],
  },
  'resident.amenities.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/resident/amenities',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"amenities"]],
    types: placeholder as Registry['resident.amenities.index']['types'],
  },
  'resident.bookings.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/resident/bookings',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"bookings"]],
    types: placeholder as Registry['resident.bookings.index']['types'],
  },
  'resident.bookings.store': {
    methods: ["POST"],
    pattern: '/api/v1/resident/bookings',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"bookings"]],
    types: placeholder as Registry['resident.bookings.store']['types'],
  },
  'resident.bookings.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/resident/bookings/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"bookings"],[1,"id"]],
    types: placeholder as Registry['resident.bookings.destroy']['types'],
  },
  'resident.tickets.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/resident/tickets',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"tickets"]],
    types: placeholder as Registry['resident.tickets.index']['types'],
  },
  'resident.tickets.store': {
    methods: ["POST"],
    pattern: '/api/v1/resident/tickets',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"tickets"]],
    types: placeholder as Registry['resident.tickets.store']['types'],
  },
  'resident.tickets.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/resident/tickets/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"tickets"],[1,"id"]],
    types: placeholder as Registry['resident.tickets.show']['types'],
  },
  'resident.tickets.comments.store': {
    methods: ["POST"],
    pattern: '/api/v1/resident/tickets/:id/comments',
    tokens: [[0,"api"],[0,"v1"],[0,"resident"],[0,"tickets"],[1,"id"],[0,"comments"]],
    types: placeholder as Registry['resident.tickets.comments.store']['types'],
  },
  'dashboard': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard',
    tokens: [[0,"api"],[0,"v1"],[0,"dashboard"]],
    types: placeholder as Registry['dashboard']['types'],
  },
  'buildings.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/buildings',
    tokens: [[0,"api"],[0,"v1"],[0,"buildings"]],
    types: placeholder as Registry['buildings.index']['types'],
  },
  'buildings.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/buildings/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"buildings"],[1,"id"]],
    types: placeholder as Registry['buildings.show']['types'],
  },
  'units.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/units',
    tokens: [[0,"api"],[0,"v1"],[0,"units"]],
    types: placeholder as Registry['units.index']['types'],
  },
  'units.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/units/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"units"],[1,"id"]],
    types: placeholder as Registry['units.show']['types'],
  },
  'occupants.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/units/:unitId/occupants',
    tokens: [[0,"api"],[0,"v1"],[0,"units"],[1,"unitId"],[0,"occupants"]],
    types: placeholder as Registry['occupants.index']['types'],
  },
  'members.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/members',
    tokens: [[0,"api"],[0,"v1"],[0,"members"]],
    types: placeholder as Registry['members.index']['types'],
  },
  'subscription.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/subscription',
    tokens: [[0,"api"],[0,"v1"],[0,"subscription"]],
    types: placeholder as Registry['subscription.show']['types'],
  },
  'settings.tenant': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/settings/tenant',
    tokens: [[0,"api"],[0,"v1"],[0,"settings"],[0,"tenant"]],
    types: placeholder as Registry['settings.tenant']['types'],
  },
  'subscription.activation': {
    methods: ["POST"],
    pattern: '/api/v1/subscription/activation',
    tokens: [[0,"api"],[0,"v1"],[0,"subscription"],[0,"activation"]],
    types: placeholder as Registry['subscription.activation']['types'],
  },
  'buildings.store': {
    methods: ["POST"],
    pattern: '/api/v1/buildings',
    tokens: [[0,"api"],[0,"v1"],[0,"buildings"]],
    types: placeholder as Registry['buildings.store']['types'],
  },
  'buildings.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/buildings/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"buildings"],[1,"id"]],
    types: placeholder as Registry['buildings.update']['types'],
  },
  'buildings.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/buildings/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"buildings"],[1,"id"]],
    types: placeholder as Registry['buildings.destroy']['types'],
  },
  'units.store': {
    methods: ["POST"],
    pattern: '/api/v1/units',
    tokens: [[0,"api"],[0,"v1"],[0,"units"]],
    types: placeholder as Registry['units.store']['types'],
  },
  'units.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/units/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"units"],[1,"id"]],
    types: placeholder as Registry['units.update']['types'],
  },
  'units.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/units/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"units"],[1,"id"]],
    types: placeholder as Registry['units.destroy']['types'],
  },
  'occupants.store': {
    methods: ["POST"],
    pattern: '/api/v1/units/:unitId/occupants',
    tokens: [[0,"api"],[0,"v1"],[0,"units"],[1,"unitId"],[0,"occupants"]],
    types: placeholder as Registry['occupants.store']['types'],
  },
  'occupants.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/units/:unitId/occupants/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"units"],[1,"unitId"],[0,"occupants"],[1,"id"]],
    types: placeholder as Registry['occupants.update']['types'],
  },
  'occupants.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/units/:unitId/occupants/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"units"],[1,"unitId"],[0,"occupants"],[1,"id"]],
    types: placeholder as Registry['occupants.destroy']['types'],
  },
  'members.store': {
    methods: ["POST"],
    pattern: '/api/v1/members',
    tokens: [[0,"api"],[0,"v1"],[0,"members"]],
    types: placeholder as Registry['members.store']['types'],
  },
  'members.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/members/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"members"],[1,"id"]],
    types: placeholder as Registry['members.update']['types'],
  },
  'members.status': {
    methods: ["PATCH"],
    pattern: '/api/v1/members/:id/status',
    tokens: [[0,"api"],[0,"v1"],[0,"members"],[1,"id"],[0,"status"]],
    types: placeholder as Registry['members.status']['types'],
  },
  'members.invitation': {
    methods: ["POST"],
    pattern: '/api/v1/members/:id/invitation',
    tokens: [[0,"api"],[0,"v1"],[0,"members"],[1,"id"],[0,"invitation"]],
    types: placeholder as Registry['members.invitation']['types'],
  },
  'settings.tenant.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/settings/tenant',
    tokens: [[0,"api"],[0,"v1"],[0,"settings"],[0,"tenant"]],
    types: placeholder as Registry['settings.tenant.update']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
