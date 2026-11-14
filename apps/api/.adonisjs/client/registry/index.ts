/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

export type { Route, Path } from './schema.d.ts'

const placeholder: any = {}

const routes = {
  'oauth.authorize': {
    methods: ["GET","HEAD"],
    pattern: '/oauth/authorize',
    tokens: [[0,"oauth"],[0,"authorize"]],
    types: placeholder as Registry['oauth.authorize']['types'],
  },
  'oauth.authorize.store': {
    methods: ["POST"],
    pattern: '/oauth/authorize',
    tokens: [[0,"oauth"],[0,"authorize"]],
    types: placeholder as Registry['oauth.authorize.store']['types'],
  },
  'oauth.token': {
    methods: ["POST"],
    pattern: '/oauth/token',
    tokens: [[0,"oauth"],[0,"token"]],
    types: placeholder as Registry['oauth.token']['types'],
  },
  'oauth.revoke': {
    methods: ["POST"],
    pattern: '/oauth/revoke',
    tokens: [[0,"oauth"],[0,"revoke"]],
    types: placeholder as Registry['oauth.revoke']['types'],
  },
  'oauth.logout': {
    methods: ["GET","HEAD"],
    pattern: '/oauth/logout',
    tokens: [[0,"oauth"],[0,"logout"]],
    types: placeholder as Registry['oauth.logout']['types'],
  },
  'profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"profile"]],
    types: placeholder as Registry['profile.show']['types'],
  },
  'profile.tenants': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/tenants',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"tenants"]],
    types: placeholder as Registry['profile.tenants']['types'],
  },
  'profile.logout': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"logout"]],
    types: placeholder as Registry['profile.logout']['types'],
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
