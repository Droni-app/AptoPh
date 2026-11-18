import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.signup': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'auth.password.forgot': { paramsTuple?: []; params?: {} }
    'auth.password.reset': { paramsTuple?: []; params?: {} }
    'auth.email.verify': { paramsTuple?: []; params?: {} }
    'invitations.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'invitations.accept': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'profile.password': { paramsTuple?: []; params?: {} }
    'profile.sessions.index': { paramsTuple?: []; params?: {} }
    'profile.sessions.destroy': { paramsTuple: [ParamValue]; params: {'sessionId': ParamValue} }
    'profile.sessions.destroyOthers': { paramsTuple?: []; params?: {} }
    'profile.email.verification': { paramsTuple?: []; params?: {} }
    'profile.tenants': { paramsTuple?: []; params?: {} }
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
    'settings.tenant': { paramsTuple?: []; params?: {} }
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
    'members.store': { paramsTuple?: []; params?: {} }
    'members.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'members.status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'members.invitation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.tenant.update': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'invitations.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.sessions.index': { paramsTuple?: []; params?: {} }
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
    'settings.tenant': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'invitations.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.sessions.index': { paramsTuple?: []; params?: {} }
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
    'settings.tenant': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.signup': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'auth.password.forgot': { paramsTuple?: []; params?: {} }
    'auth.password.reset': { paramsTuple?: []; params?: {} }
    'auth.email.verify': { paramsTuple?: []; params?: {} }
    'invitations.accept': { paramsTuple?: []; params?: {} }
    'profile.email.verification': { paramsTuple?: []; params?: {} }
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
    'members.store': { paramsTuple?: []; params?: {} }
    'members.invitation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'profile.update': { paramsTuple?: []; params?: {} }
    'resident.vehicles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.pets.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.household.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'buildings.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.update': { paramsTuple: [ParamValue,ParamValue]; params: {'unitId': ParamValue,'id': ParamValue} }
    'members.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'members.status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.tenant.update': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'profile.password': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'profile.sessions.destroy': { paramsTuple: [ParamValue]; params: {'sessionId': ParamValue} }
    'profile.sessions.destroyOthers': { paramsTuple?: []; params?: {} }
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