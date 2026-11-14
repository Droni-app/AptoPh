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
  resident: {
    home: typeof routes['resident.home']
    units: {
      show: typeof routes['resident.units.show']
    }
    vehicles: {
      store: typeof routes['resident.vehicles.store']
      update: typeof routes['resident.vehicles.update']
      destroy: typeof routes['resident.vehicles.destroy']
    }
    pets: {
      store: typeof routes['resident.pets.store']
      update: typeof routes['resident.pets.update']
      destroy: typeof routes['resident.pets.destroy']
    }
    household: {
      store: typeof routes['resident.household.store']
      update: typeof routes['resident.household.update']
      destroy: typeof routes['resident.household.destroy']
    }
    visits: {
      index: typeof routes['resident.visits.index']
      store: typeof routes['resident.visits.store']
      destroy: typeof routes['resident.visits.destroy']
    }
    parcels: {
      index: typeof routes['resident.parcels.index']
    }
    amenities: {
      index: typeof routes['resident.amenities.index']
    }
    bookings: {
      index: typeof routes['resident.bookings.index']
      store: typeof routes['resident.bookings.store']
      destroy: typeof routes['resident.bookings.destroy']
    }
    tickets: {
      index: typeof routes['resident.tickets.index']
      store: typeof routes['resident.tickets.store']
      show: typeof routes['resident.tickets.show']
      comments: {
        store: typeof routes['resident.tickets.comments.store']
      }
    }
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
