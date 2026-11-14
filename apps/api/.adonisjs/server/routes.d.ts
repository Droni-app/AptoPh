import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'oauth.authorize': { paramsTuple?: []; params?: {} }
    'oauth.authorize.store': { paramsTuple?: []; params?: {} }
    'oauth.token': { paramsTuple?: []; params?: {} }
    'oauth.revoke': { paramsTuple?: []; params?: {} }
    'oauth.logout': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.tenants': { paramsTuple?: []; params?: {} }
    'profile.logout': { paramsTuple?: []; params?: {} }
    'tenant.current': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'buildings.index': { paramsTuple?: []; params?: {} }
    'buildings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.index': { paramsTuple?: []; params?: {} }
    'units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.index': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'members.index': { paramsTuple?: []; params?: {} }
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
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.tenants': { paramsTuple?: []; params?: {} }
    'tenant.current': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'buildings.index': { paramsTuple?: []; params?: {} }
    'buildings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.index': { paramsTuple?: []; params?: {} }
    'units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.index': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'members.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'oauth.authorize': { paramsTuple?: []; params?: {} }
    'oauth.logout': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.tenants': { paramsTuple?: []; params?: {} }
    'tenant.current': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'buildings.index': { paramsTuple?: []; params?: {} }
    'buildings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.index': { paramsTuple?: []; params?: {} }
    'units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.index': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'members.index': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'oauth.authorize.store': { paramsTuple?: []; params?: {} }
    'oauth.token': { paramsTuple?: []; params?: {} }
    'oauth.revoke': { paramsTuple?: []; params?: {} }
    'profile.logout': { paramsTuple?: []; params?: {} }
    'buildings.store': { paramsTuple?: []; params?: {} }
    'units.store': { paramsTuple?: []; params?: {} }
    'occupants.store': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
  }
  PATCH: {
    'buildings.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.update': { paramsTuple: [ParamValue,ParamValue]; params: {'unitId': ParamValue,'id': ParamValue} }
  }
  DELETE: {
    'buildings.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'unitId': ParamValue,'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}