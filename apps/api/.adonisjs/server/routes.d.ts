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
    'resident.statement': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.payments.report': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.payments.index': { paramsTuple?: []; params?: {} }
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
    'finance.summary': { paramsTuple?: []; params?: {} }
    'finance.settings': { paramsTuple?: []; params?: {} }
    'finance.accounts.index': { paramsTuple?: []; params?: {} }
    'finance.concepts.index': { paramsTuple?: []; params?: {} }
    'finance.cash.index': { paramsTuple?: []; params?: {} }
    'finance.periods.index': { paramsTuple?: []; params?: {} }
    'finance.periods.preview': { paramsTuple?: []; params?: {} }
    'finance.periods.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.charges.index': { paramsTuple?: []; params?: {} }
    'finance.charges.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.recurring.index': { paramsTuple?: []; params?: {} }
    'finance.schedules.index': { paramsTuple?: []; params?: {} }
    'finance.modules.index': { paramsTuple?: []; params?: {} }
    'finance.payments.index': { paramsTuple?: []; params?: {} }
    'finance.payments.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.vendors.index': { paramsTuple?: []; params?: {} }
    'finance.vendors.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.bills.index': { paramsTuple?: []; params?: {} }
    'finance.bills.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.egresos.index': { paramsTuple?: []; params?: {} }
    'finance.egresos.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budgets.index': { paramsTuple?: []; params?: {} }
    'finance.budgets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.journal.index': { paramsTuple?: []; params?: {} }
    'finance.journal.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.units.statement': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'finance.aging.receivables': { paramsTuple?: []; params?: {} }
    'finance.aging.payables': { paramsTuple?: []; params?: {} }
    'finance.reports.trialBalance': { paramsTuple?: []; params?: {} }
    'finance.reports.incomeStatement': { paramsTuple?: []; params?: {} }
    'finance.reports.balanceSheet': { paramsTuple?: []; params?: {} }
    'finance.reports.ledger': { paramsTuple?: []; params?: {} }
    'finance.write.settings.update': { paramsTuple?: []; params?: {} }
    'finance.write.accounts.store': { paramsTuple?: []; params?: {} }
    'finance.write.accounts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.concepts.store': { paramsTuple?: []; params?: {} }
    'finance.write.concepts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.cash.store': { paramsTuple?: []; params?: {} }
    'finance.write.cash.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.transfers.store': { paramsTuple?: []; params?: {} }
    'finance.write.periods.generate': { paramsTuple?: []; params?: {} }
    'finance.write.periods.close': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.periods.reopen': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.charges.store': { paramsTuple?: []; params?: {} }
    'finance.write.charges.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.charges.creditNote': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.recurring.store': { paramsTuple?: []; params?: {} }
    'finance.write.recurring.end': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.schedules.preview': { paramsTuple?: []; params?: {} }
    'finance.write.schedules.store': { paramsTuple?: []; params?: {} }
    'finance.write.modules.store': { paramsTuple?: []; params?: {} }
    'finance.write.modules.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.modules.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.payments.store': { paramsTuple?: []; params?: {} }
    'finance.write.payments.confirm': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.payments.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.payments.reverse': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.vendors.store': { paramsTuple?: []; params?: {} }
    'finance.write.vendors.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.bills.store': { paramsTuple?: []; params?: {} }
    'finance.write.bills.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.egresos.store': { paramsTuple?: []; params?: {} }
    'finance.write.egresos.reverse': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.budgets.store': { paramsTuple?: []; params?: {} }
    'finance.write.budgets.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.budgets.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.budgets.reopen': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.budgets.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.journal.store': { paramsTuple?: []; params?: {} }
    'finance.write.journal.reverse': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'resident.statement': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.payments.index': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'buildings.index': { paramsTuple?: []; params?: {} }
    'buildings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.index': { paramsTuple?: []; params?: {} }
    'units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.index': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'members.index': { paramsTuple?: []; params?: {} }
    'subscription.show': { paramsTuple?: []; params?: {} }
    'settings.tenant': { paramsTuple?: []; params?: {} }
    'finance.summary': { paramsTuple?: []; params?: {} }
    'finance.settings': { paramsTuple?: []; params?: {} }
    'finance.accounts.index': { paramsTuple?: []; params?: {} }
    'finance.concepts.index': { paramsTuple?: []; params?: {} }
    'finance.cash.index': { paramsTuple?: []; params?: {} }
    'finance.periods.index': { paramsTuple?: []; params?: {} }
    'finance.periods.preview': { paramsTuple?: []; params?: {} }
    'finance.periods.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.charges.index': { paramsTuple?: []; params?: {} }
    'finance.charges.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.recurring.index': { paramsTuple?: []; params?: {} }
    'finance.schedules.index': { paramsTuple?: []; params?: {} }
    'finance.modules.index': { paramsTuple?: []; params?: {} }
    'finance.payments.index': { paramsTuple?: []; params?: {} }
    'finance.payments.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.vendors.index': { paramsTuple?: []; params?: {} }
    'finance.vendors.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.bills.index': { paramsTuple?: []; params?: {} }
    'finance.bills.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.egresos.index': { paramsTuple?: []; params?: {} }
    'finance.egresos.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budgets.index': { paramsTuple?: []; params?: {} }
    'finance.budgets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.journal.index': { paramsTuple?: []; params?: {} }
    'finance.journal.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.units.statement': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'finance.aging.receivables': { paramsTuple?: []; params?: {} }
    'finance.aging.payables': { paramsTuple?: []; params?: {} }
    'finance.reports.trialBalance': { paramsTuple?: []; params?: {} }
    'finance.reports.incomeStatement': { paramsTuple?: []; params?: {} }
    'finance.reports.balanceSheet': { paramsTuple?: []; params?: {} }
    'finance.reports.ledger': { paramsTuple?: []; params?: {} }
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
    'resident.statement': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.payments.index': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'buildings.index': { paramsTuple?: []; params?: {} }
    'buildings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.index': { paramsTuple?: []; params?: {} }
    'units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.index': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'members.index': { paramsTuple?: []; params?: {} }
    'subscription.show': { paramsTuple?: []; params?: {} }
    'settings.tenant': { paramsTuple?: []; params?: {} }
    'finance.summary': { paramsTuple?: []; params?: {} }
    'finance.settings': { paramsTuple?: []; params?: {} }
    'finance.accounts.index': { paramsTuple?: []; params?: {} }
    'finance.concepts.index': { paramsTuple?: []; params?: {} }
    'finance.cash.index': { paramsTuple?: []; params?: {} }
    'finance.periods.index': { paramsTuple?: []; params?: {} }
    'finance.periods.preview': { paramsTuple?: []; params?: {} }
    'finance.periods.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.charges.index': { paramsTuple?: []; params?: {} }
    'finance.charges.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.recurring.index': { paramsTuple?: []; params?: {} }
    'finance.schedules.index': { paramsTuple?: []; params?: {} }
    'finance.modules.index': { paramsTuple?: []; params?: {} }
    'finance.payments.index': { paramsTuple?: []; params?: {} }
    'finance.payments.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.vendors.index': { paramsTuple?: []; params?: {} }
    'finance.vendors.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.bills.index': { paramsTuple?: []; params?: {} }
    'finance.bills.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.egresos.index': { paramsTuple?: []; params?: {} }
    'finance.egresos.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budgets.index': { paramsTuple?: []; params?: {} }
    'finance.budgets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.journal.index': { paramsTuple?: []; params?: {} }
    'finance.journal.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.units.statement': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'finance.aging.receivables': { paramsTuple?: []; params?: {} }
    'finance.aging.payables': { paramsTuple?: []; params?: {} }
    'finance.reports.trialBalance': { paramsTuple?: []; params?: {} }
    'finance.reports.incomeStatement': { paramsTuple?: []; params?: {} }
    'finance.reports.balanceSheet': { paramsTuple?: []; params?: {} }
    'finance.reports.ledger': { paramsTuple?: []; params?: {} }
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
    'resident.payments.report': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'subscription.activation': { paramsTuple?: []; params?: {} }
    'buildings.store': { paramsTuple?: []; params?: {} }
    'units.store': { paramsTuple?: []; params?: {} }
    'occupants.store': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'members.store': { paramsTuple?: []; params?: {} }
    'members.invitation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.accounts.store': { paramsTuple?: []; params?: {} }
    'finance.write.concepts.store': { paramsTuple?: []; params?: {} }
    'finance.write.cash.store': { paramsTuple?: []; params?: {} }
    'finance.write.transfers.store': { paramsTuple?: []; params?: {} }
    'finance.write.periods.generate': { paramsTuple?: []; params?: {} }
    'finance.write.periods.close': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.periods.reopen': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.charges.store': { paramsTuple?: []; params?: {} }
    'finance.write.charges.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.charges.creditNote': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.recurring.store': { paramsTuple?: []; params?: {} }
    'finance.write.recurring.end': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.schedules.preview': { paramsTuple?: []; params?: {} }
    'finance.write.schedules.store': { paramsTuple?: []; params?: {} }
    'finance.write.modules.store': { paramsTuple?: []; params?: {} }
    'finance.write.payments.store': { paramsTuple?: []; params?: {} }
    'finance.write.payments.confirm': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.payments.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.payments.reverse': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.vendors.store': { paramsTuple?: []; params?: {} }
    'finance.write.bills.store': { paramsTuple?: []; params?: {} }
    'finance.write.bills.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.egresos.store': { paramsTuple?: []; params?: {} }
    'finance.write.egresos.reverse': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.budgets.store': { paramsTuple?: []; params?: {} }
    'finance.write.budgets.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.budgets.reopen': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.journal.store': { paramsTuple?: []; params?: {} }
    'finance.write.journal.reverse': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'finance.write.accounts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.cash.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'profile.password': { paramsTuple?: []; params?: {} }
    'finance.write.settings.update': { paramsTuple?: []; params?: {} }
    'finance.write.concepts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.modules.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.vendors.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.budgets.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'finance.write.modules.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.budgets.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}