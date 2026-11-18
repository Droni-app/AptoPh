import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'oauth.authorize': { paramsTuple?: []; params?: {} }
    'oauth.authorize.store': { paramsTuple?: []; params?: {} }
    'oauth.token': { paramsTuple?: []; params?: {} }
    'oauth.revoke': { paramsTuple?: []; params?: {} }
    'oauth.logout': { paramsTuple?: []; params?: {} }
    'signup': { paramsTuple?: []; params?: {} }
    'signup.store': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.tenants': { paramsTuple?: []; params?: {} }
    'profile.logout': { paramsTuple?: []; params?: {} }
    'tenant.current': { paramsTuple?: []; params?: {} }
    'resident.home': { paramsTuple?: []; params?: {} }
    'resident.units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.vehicles.store': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.vehicles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.vehicles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.pets.store': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.pets.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.pets.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.household.store': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.household.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.household.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.visits.index': { paramsTuple?: []; params?: {} }
    'resident.visits.store': { paramsTuple?: []; params?: {} }
    'resident.visits.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.parcels.index': { paramsTuple?: []; params?: {} }
    'resident.amenities.index': { paramsTuple?: []; params?: {} }
    'resident.bookings.index': { paramsTuple?: []; params?: {} }
    'resident.bookings.store': { paramsTuple?: []; params?: {} }
    'resident.bookings.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.tickets.index': { paramsTuple?: []; params?: {} }
    'resident.tickets.store': { paramsTuple?: []; params?: {} }
    'resident.tickets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.tickets.comments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'buildings.index': { paramsTuple?: []; params?: {} }
    'buildings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.index': { paramsTuple?: []; params?: {} }
    'units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.index': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'members.index': { paramsTuple?: []; params?: {} }
    'subscription.show': { paramsTuple?: []; params?: {} }
    'subscription.activation': { paramsTuple?: []; params?: {} }
    'buildings.store': { paramsTuple?: []; params?: {} }
    'buildings.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'buildings.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.store': { paramsTuple?: []; params?: {} }
    'units.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.store': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'occupants.update': { paramsTuple: [ParamValue,ParamValue]; params: {'unitId': ParamValue,'id': ParamValue} }
    'occupants.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'unitId': ParamValue,'id': ParamValue} }
  }
  GET: {
    'oauth.authorize': { paramsTuple?: []; params?: {} }
    'oauth.logout': { paramsTuple?: []; params?: {} }
    'signup': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.tenants': { paramsTuple?: []; params?: {} }
    'tenant.current': { paramsTuple?: []; params?: {} }
    'resident.home': { paramsTuple?: []; params?: {} }
    'resident.units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.visits.index': { paramsTuple?: []; params?: {} }
    'resident.parcels.index': { paramsTuple?: []; params?: {} }
    'resident.amenities.index': { paramsTuple?: []; params?: {} }
    'resident.bookings.index': { paramsTuple?: []; params?: {} }
    'resident.tickets.index': { paramsTuple?: []; params?: {} }
    'resident.tickets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'buildings.index': { paramsTuple?: []; params?: {} }
    'buildings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.index': { paramsTuple?: []; params?: {} }
    'units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.index': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'members.index': { paramsTuple?: []; params?: {} }
    'subscription.show': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'oauth.authorize': { paramsTuple?: []; params?: {} }
    'oauth.logout': { paramsTuple?: []; params?: {} }
    'signup': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.tenants': { paramsTuple?: []; params?: {} }
    'tenant.current': { paramsTuple?: []; params?: {} }
    'resident.home': { paramsTuple?: []; params?: {} }
    'resident.units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.visits.index': { paramsTuple?: []; params?: {} }
    'resident.parcels.index': { paramsTuple?: []; params?: {} }
    'resident.amenities.index': { paramsTuple?: []; params?: {} }
    'resident.bookings.index': { paramsTuple?: []; params?: {} }
    'resident.tickets.index': { paramsTuple?: []; params?: {} }
    'resident.tickets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'buildings.index': { paramsTuple?: []; params?: {} }
    'buildings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.index': { paramsTuple?: []; params?: {} }
    'units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.index': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'members.index': { paramsTuple?: []; params?: {} }
    'subscription.show': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'oauth.authorize.store': { paramsTuple?: []; params?: {} }
    'oauth.token': { paramsTuple?: []; params?: {} }
    'oauth.revoke': { paramsTuple?: []; params?: {} }
    'signup.store': { paramsTuple?: []; params?: {} }
    'profile.logout': { paramsTuple?: []; params?: {} }
    'resident.vehicles.store': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.pets.store': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.household.store': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.visits.store': { paramsTuple?: []; params?: {} }
    'resident.bookings.store': { paramsTuple?: []; params?: {} }
    'resident.tickets.store': { paramsTuple?: []; params?: {} }
    'resident.tickets.comments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscription.activation': { paramsTuple?: []; params?: {} }
    'buildings.store': { paramsTuple?: []; params?: {} }
    'units.store': { paramsTuple?: []; params?: {} }
    'occupants.store': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
  }
  PATCH: {
    'resident.vehicles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.pets.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.household.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'buildings.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.update': { paramsTuple: [ParamValue,ParamValue]; params: {'unitId': ParamValue,'id': ParamValue} }
  }
  DELETE: {
    'resident.vehicles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.pets.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.household.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.visits.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.bookings.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'buildings.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'unitId': ParamValue,'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}