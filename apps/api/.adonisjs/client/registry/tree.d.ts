/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  oauth: {
    authorize: typeof routes['oauth.authorize'] & {
      store: typeof routes['oauth.authorize.store']
    }
    token: typeof routes['oauth.token']
    revoke: typeof routes['oauth.revoke']
    logout: typeof routes['oauth.logout']
  }
  profile: {
    show: typeof routes['profile.show']
    tenants: typeof routes['profile.tenants']
    logout: typeof routes['profile.logout']
  }
  tenant: {
    current: typeof routes['tenant.current']
  }
  dashboard: typeof routes['dashboard']
  buildings: {
    index: typeof routes['buildings.index']
    show: typeof routes['buildings.show']
    store: typeof routes['buildings.store']
    update: typeof routes['buildings.update']
    destroy: typeof routes['buildings.destroy']
  }
  units: {
    index: typeof routes['units.index']
    show: typeof routes['units.show']
    store: typeof routes['units.store']
    update: typeof routes['units.update']
    destroy: typeof routes['units.destroy']
  }
  occupants: {
    index: typeof routes['occupants.index']
    store: typeof routes['occupants.store']
    update: typeof routes['occupants.update']
    destroy: typeof routes['occupants.destroy']
  }
  members: {
    index: typeof routes['members.index']
  }
}
