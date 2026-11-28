import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.signup': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'auth.password.forgot': { paramsTuple?: []; params?: {} }
    'auth.password.reset': { paramsTuple?: []; params?: {} }
    'auth.email.verify': { paramsTuple?: []; params?: {} }
    'auth.providers': { paramsTuple?: []; params?: {} }
    'auth.google.start': { paramsTuple?: []; params?: {} }
    'auth.google.callback': { paramsTuple?: []; params?: {} }
    'auth.google.token': { paramsTuple?: []; params?: {} }
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
    'profile.notifications.preferences': { paramsTuple?: []; params?: {} }
    'profile.notifications.preferences.update': { paramsTuple?: []; params?: {} }
    'profile.push.store': { paramsTuple?: []; params?: {} }
    'profile.push.destroy': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'notifications.index': { paramsTuple?: []; params?: {} }
    'notifications.unread': { paramsTuple?: []; params?: {} }
    'notifications.readAll': { paramsTuple?: []; params?: {} }
    'notifications.read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'resident.amenities.availability': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.bookings.index': { paramsTuple?: []; params?: {} }
    'resident.bookings.quote': { paramsTuple?: []; params?: {} }
    'resident.bookings.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.bookings.store': { paramsTuple?: []; params?: {} }
    'resident.bookings.attachments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.bookings.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.tickets.index': { paramsTuple?: []; params?: {} }
    'resident.tickets.store': { paramsTuple?: []; params?: {} }
    'resident.tickets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.tickets.comments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.statement': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.payments.report': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.payments.index': { paramsTuple?: []; params?: {} }
    'resident.payments.attachments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.attachments.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.announcements.index': { paramsTuple?: []; params?: {} }
    'resident.announcements.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.announcements.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.documents.index': { paramsTuple?: []; params?: {} }
    'resident.documents.folders': { paramsTuple?: []; params?: {} }
    'resident.documents.files.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.documents.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.surveys.index': { paramsTuple?: []; params?: {} }
    'resident.surveys.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.surveys.vote': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.parking.show': { paramsTuple?: []; params?: {} }
    'resident.parking.apply': { paramsTuple?: []; params?: {} }
    'resident.parking.withdraw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.parking.accept': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.parking.decline': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'buildings.index': { paramsTuple?: []; params?: {} }
    'buildings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.index': { paramsTuple?: []; params?: {} }
    'units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.index': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'members.index': { paramsTuple?: []; params?: {} }
    'subscription.show': { paramsTuple?: []; params?: {} }
    'emailQuota.show': { paramsTuple?: []; params?: {} }
    'settings.tenant': { paramsTuple?: []; params?: {} }
    'announcements.index': { paramsTuple?: []; params?: {} }
    'announcements.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.readers': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.store': { paramsTuple?: []; params?: {} }
    'announcements.emailPreview': { paramsTuple?: []; params?: {} }
    'announcements.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.publish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.unpublish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.image.set': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.image.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.attachments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.attachments.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'amenities.index': { paramsTuple?: []; params?: {} }
    'bookings.calendar': { paramsTuple?: []; params?: {} }
    'bookings.stats': { paramsTuple?: []; params?: {} }
    'bookings.index': { paramsTuple?: []; params?: {} }
    'bookings.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'amenities.store': { paramsTuple?: []; params?: {} }
    'amenities.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'amenities.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.quote': { paramsTuple?: []; params?: {} }
    'bookings.store': { paramsTuple?: []; params?: {} }
    'bookings.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.deposit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.attachments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.attachments.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.index': { paramsTuple?: []; params?: {} }
    'documents.folders': { paramsTuple?: []; params?: {} }
    'documents.files.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.stats': { paramsTuple?: []; params?: {} }
    'documents.store': { paramsTuple?: []; params?: {} }
    'documents.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.versions.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.versions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.publish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.unpublish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.folders.store': { paramsTuple?: []; params?: {} }
    'documents.folders.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.folders.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'surveys.index': { paramsTuple?: []; params?: {} }
    'surveys.stats': { paramsTuple?: []; params?: {} }
    'surveys.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'surveys.voters': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'surveys.store': { paramsTuple?: []; params?: {} }
    'surveys.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'surveys.publish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'surveys.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tickets.index': { paramsTuple?: []; params?: {} }
    'tickets.stats': { paramsTuple?: []; params?: {} }
    'tickets.assignees': { paramsTuple?: []; params?: {} }
    'tickets.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tickets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tickets.write.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tickets.write.comments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tickets.write.attachments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tickets.write.attachments.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'visitorParking.summary': { paramsTuple?: []; params?: {} }
    'visitorParking.settings': { paramsTuple?: []; params?: {} }
    'visitorParking.lookup': { paramsTuple?: []; params?: {} }
    'visitorParking.stays.index': { paramsTuple?: []; params?: {} }
    'visitorParking.stays.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'visitorParking.write.stays.store': { paramsTuple?: []; params?: {} }
    'visitorParking.write.stays.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'visitorParking.write.stays.exit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'visitorParking.write.stays.receipt': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'visitorParking.settings.update': { paramsTuple?: []; params?: {} }
    'parking.summary': { paramsTuple?: []; params?: {} }
    'parking.spots.index': { paramsTuple?: []; params?: {} }
    'parking.assignments.index': { paramsTuple?: []; params?: {} }
    'parking.lookup': { paramsTuple?: []; params?: {} }
    'parking.manage.read.settings': { paramsTuple?: []; params?: {} }
    'parking.manage.read.eligibility': { paramsTuple?: []; params?: {} }
    'parking.lotteries.read.lotteries.index': { paramsTuple?: []; params?: {} }
    'parking.lotteries.read.lotteries.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.lotteries.read.lotteries.applications': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.settings.update': { paramsTuple?: []; params?: {} }
    'parking.manage.spots.store': { paramsTuple?: []; params?: {} }
    'parking.manage.spots.batch': { paramsTuple?: []; params?: {} }
    'parking.manage.spots.import': { paramsTuple?: []; params?: {} }
    'parking.manage.spots.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.spots.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.assignments.store': { paramsTuple?: []; params?: {} }
    'parking.manage.assignments.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.assignments.end': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.lotteries.store': { paramsTuple?: []; params?: {} }
    'parking.manage.lotteries.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.lotteries.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.lotteries.draw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.lotteries.offer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.lotteries.apply': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.applications.withdraw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.applications.assign': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reports.options': { paramsTuple?: []; params?: {} }
    'reports.export': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'reports.show': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'auditLogs.index': { paramsTuple?: []; params?: {} }
    'auditLogs.export': { paramsTuple?: []; params?: {} }
    'auditLogs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'billing.show': { paramsTuple?: []; params?: {} }
    'billing.config': { paramsTuple?: []; params?: {} }
    'billing.charges.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'billing.tokens.show': { paramsTuple: [ParamValue,ParamValue]; params: {'type': ParamValue,'tokenId': ParamValue} }
    'billing.autoRenew': { paramsTuple?: []; params?: {} }
    'billing.paymentMethod.destroy': { paramsTuple?: []; params?: {} }
    'billing.paymentMethod.save': { paramsTuple?: []; params?: {} }
    'billing.tokens.nequi': { paramsTuple?: []; params?: {} }
    'billing.tokens.daviplata': { paramsTuple?: []; params?: {} }
    'billing.tokens.daviplataOtp': { paramsTuple?: []; params?: {} }
    'billing.tokens.bancolombia': { paramsTuple?: []; params?: {} }
    'billing.pay': { paramsTuple?: []; params?: {} }
    'billing.emailPacks': { paramsTuple?: []; params?: {} }
    'webhooks.wompi': { paramsTuple?: []; params?: {} }
    'public.announcementImages.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'buildings.store': { paramsTuple?: []; params?: {} }
    'buildings.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'buildings.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.store': { paramsTuple?: []; params?: {} }
    'units.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.store': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'occupants.update': { paramsTuple: [ParamValue,ParamValue]; params: {'unitId': ParamValue,'id': ParamValue} }
    'occupants.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'unitId': ParamValue,'id': ParamValue} }
    'imports.property.preview': { paramsTuple?: []; params?: {} }
    'imports.property.plan': { paramsTuple?: []; params?: {} }
    'imports.property.apply': { paramsTuple?: []; params?: {} }
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
    'finance.attachments.index': { paramsTuple: [ParamValue,ParamValue]; params: {'ownerType': ParamValue,'ownerId': ParamValue} }
    'finance.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'finance.write.attachments.store': { paramsTuple: [ParamValue,ParamValue]; params: {'ownerType': ParamValue,'ownerId': ParamValue} }
    'finance.write.attachments.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'auth.providers': { paramsTuple?: []; params?: {} }
    'auth.google.start': { paramsTuple?: []; params?: {} }
    'invitations.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.sessions.index': { paramsTuple?: []; params?: {} }
    'profile.tenants': { paramsTuple?: []; params?: {} }
    'profile.notifications.preferences': { paramsTuple?: []; params?: {} }
    'notifications.index': { paramsTuple?: []; params?: {} }
    'notifications.unread': { paramsTuple?: []; params?: {} }
    'tenant.current': { paramsTuple?: []; params?: {} }
    'resident.home': { paramsTuple?: []; params?: {} }
    'resident.units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.visits.index': { paramsTuple?: []; params?: {} }
    'resident.parcels.index': { paramsTuple?: []; params?: {} }
    'resident.amenities.index': { paramsTuple?: []; params?: {} }
    'resident.amenities.availability': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.bookings.index': { paramsTuple?: []; params?: {} }
    'resident.bookings.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.tickets.index': { paramsTuple?: []; params?: {} }
    'resident.tickets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.statement': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.payments.index': { paramsTuple?: []; params?: {} }
    'resident.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.announcements.index': { paramsTuple?: []; params?: {} }
    'resident.announcements.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.announcements.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.documents.index': { paramsTuple?: []; params?: {} }
    'resident.documents.folders': { paramsTuple?: []; params?: {} }
    'resident.documents.files.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.documents.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.surveys.index': { paramsTuple?: []; params?: {} }
    'resident.surveys.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.parking.show': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'buildings.index': { paramsTuple?: []; params?: {} }
    'buildings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.index': { paramsTuple?: []; params?: {} }
    'units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.index': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'members.index': { paramsTuple?: []; params?: {} }
    'subscription.show': { paramsTuple?: []; params?: {} }
    'emailQuota.show': { paramsTuple?: []; params?: {} }
    'settings.tenant': { paramsTuple?: []; params?: {} }
    'announcements.index': { paramsTuple?: []; params?: {} }
    'announcements.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.readers': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'amenities.index': { paramsTuple?: []; params?: {} }
    'bookings.calendar': { paramsTuple?: []; params?: {} }
    'bookings.stats': { paramsTuple?: []; params?: {} }
    'bookings.index': { paramsTuple?: []; params?: {} }
    'bookings.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.index': { paramsTuple?: []; params?: {} }
    'documents.folders': { paramsTuple?: []; params?: {} }
    'documents.files.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.stats': { paramsTuple?: []; params?: {} }
    'surveys.index': { paramsTuple?: []; params?: {} }
    'surveys.stats': { paramsTuple?: []; params?: {} }
    'surveys.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'surveys.voters': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tickets.index': { paramsTuple?: []; params?: {} }
    'tickets.stats': { paramsTuple?: []; params?: {} }
    'tickets.assignees': { paramsTuple?: []; params?: {} }
    'tickets.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tickets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'visitorParking.summary': { paramsTuple?: []; params?: {} }
    'visitorParking.settings': { paramsTuple?: []; params?: {} }
    'visitorParking.lookup': { paramsTuple?: []; params?: {} }
    'visitorParking.stays.index': { paramsTuple?: []; params?: {} }
    'visitorParking.stays.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.summary': { paramsTuple?: []; params?: {} }
    'parking.spots.index': { paramsTuple?: []; params?: {} }
    'parking.assignments.index': { paramsTuple?: []; params?: {} }
    'parking.lookup': { paramsTuple?: []; params?: {} }
    'parking.manage.read.settings': { paramsTuple?: []; params?: {} }
    'parking.manage.read.eligibility': { paramsTuple?: []; params?: {} }
    'parking.lotteries.read.lotteries.index': { paramsTuple?: []; params?: {} }
    'parking.lotteries.read.lotteries.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.lotteries.read.lotteries.applications': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reports.options': { paramsTuple?: []; params?: {} }
    'reports.export': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'reports.show': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'auditLogs.index': { paramsTuple?: []; params?: {} }
    'auditLogs.export': { paramsTuple?: []; params?: {} }
    'auditLogs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'billing.show': { paramsTuple?: []; params?: {} }
    'billing.config': { paramsTuple?: []; params?: {} }
    'billing.charges.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'billing.tokens.show': { paramsTuple: [ParamValue,ParamValue]; params: {'type': ParamValue,'tokenId': ParamValue} }
    'public.announcementImages.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'finance.attachments.index': { paramsTuple: [ParamValue,ParamValue]; params: {'ownerType': ParamValue,'ownerId': ParamValue} }
    'finance.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'auth.providers': { paramsTuple?: []; params?: {} }
    'auth.google.start': { paramsTuple?: []; params?: {} }
    'invitations.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.sessions.index': { paramsTuple?: []; params?: {} }
    'profile.tenants': { paramsTuple?: []; params?: {} }
    'profile.notifications.preferences': { paramsTuple?: []; params?: {} }
    'notifications.index': { paramsTuple?: []; params?: {} }
    'notifications.unread': { paramsTuple?: []; params?: {} }
    'tenant.current': { paramsTuple?: []; params?: {} }
    'resident.home': { paramsTuple?: []; params?: {} }
    'resident.units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.visits.index': { paramsTuple?: []; params?: {} }
    'resident.parcels.index': { paramsTuple?: []; params?: {} }
    'resident.amenities.index': { paramsTuple?: []; params?: {} }
    'resident.amenities.availability': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.bookings.index': { paramsTuple?: []; params?: {} }
    'resident.bookings.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.tickets.index': { paramsTuple?: []; params?: {} }
    'resident.tickets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.statement': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.payments.index': { paramsTuple?: []; params?: {} }
    'resident.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.announcements.index': { paramsTuple?: []; params?: {} }
    'resident.announcements.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.announcements.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.documents.index': { paramsTuple?: []; params?: {} }
    'resident.documents.folders': { paramsTuple?: []; params?: {} }
    'resident.documents.files.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.documents.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.surveys.index': { paramsTuple?: []; params?: {} }
    'resident.surveys.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.parking.show': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'buildings.index': { paramsTuple?: []; params?: {} }
    'buildings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.index': { paramsTuple?: []; params?: {} }
    'units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.index': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'members.index': { paramsTuple?: []; params?: {} }
    'subscription.show': { paramsTuple?: []; params?: {} }
    'emailQuota.show': { paramsTuple?: []; params?: {} }
    'settings.tenant': { paramsTuple?: []; params?: {} }
    'announcements.index': { paramsTuple?: []; params?: {} }
    'announcements.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.readers': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'amenities.index': { paramsTuple?: []; params?: {} }
    'bookings.calendar': { paramsTuple?: []; params?: {} }
    'bookings.stats': { paramsTuple?: []; params?: {} }
    'bookings.index': { paramsTuple?: []; params?: {} }
    'bookings.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.index': { paramsTuple?: []; params?: {} }
    'documents.folders': { paramsTuple?: []; params?: {} }
    'documents.files.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.stats': { paramsTuple?: []; params?: {} }
    'surveys.index': { paramsTuple?: []; params?: {} }
    'surveys.stats': { paramsTuple?: []; params?: {} }
    'surveys.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'surveys.voters': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tickets.index': { paramsTuple?: []; params?: {} }
    'tickets.stats': { paramsTuple?: []; params?: {} }
    'tickets.assignees': { paramsTuple?: []; params?: {} }
    'tickets.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tickets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'visitorParking.summary': { paramsTuple?: []; params?: {} }
    'visitorParking.settings': { paramsTuple?: []; params?: {} }
    'visitorParking.lookup': { paramsTuple?: []; params?: {} }
    'visitorParking.stays.index': { paramsTuple?: []; params?: {} }
    'visitorParking.stays.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.summary': { paramsTuple?: []; params?: {} }
    'parking.spots.index': { paramsTuple?: []; params?: {} }
    'parking.assignments.index': { paramsTuple?: []; params?: {} }
    'parking.lookup': { paramsTuple?: []; params?: {} }
    'parking.manage.read.settings': { paramsTuple?: []; params?: {} }
    'parking.manage.read.eligibility': { paramsTuple?: []; params?: {} }
    'parking.lotteries.read.lotteries.index': { paramsTuple?: []; params?: {} }
    'parking.lotteries.read.lotteries.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.lotteries.read.lotteries.applications': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reports.options': { paramsTuple?: []; params?: {} }
    'reports.export': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'reports.show': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'auditLogs.index': { paramsTuple?: []; params?: {} }
    'auditLogs.export': { paramsTuple?: []; params?: {} }
    'auditLogs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'billing.show': { paramsTuple?: []; params?: {} }
    'billing.config': { paramsTuple?: []; params?: {} }
    'billing.charges.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'billing.tokens.show': { paramsTuple: [ParamValue,ParamValue]; params: {'type': ParamValue,'tokenId': ParamValue} }
    'public.announcementImages.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'finance.attachments.index': { paramsTuple: [ParamValue,ParamValue]; params: {'ownerType': ParamValue,'ownerId': ParamValue} }
    'finance.attachments.url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.signup': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'auth.password.forgot': { paramsTuple?: []; params?: {} }
    'auth.password.reset': { paramsTuple?: []; params?: {} }
    'auth.email.verify': { paramsTuple?: []; params?: {} }
    'auth.google.callback': { paramsTuple?: []; params?: {} }
    'auth.google.token': { paramsTuple?: []; params?: {} }
    'invitations.accept': { paramsTuple?: []; params?: {} }
    'profile.email.verification': { paramsTuple?: []; params?: {} }
    'profile.push.store': { paramsTuple?: []; params?: {} }
    'notifications.readAll': { paramsTuple?: []; params?: {} }
    'notifications.read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.vehicles.store': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.pets.store': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.household.store': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.visits.store': { paramsTuple?: []; params?: {} }
    'resident.bookings.quote': { paramsTuple?: []; params?: {} }
    'resident.bookings.store': { paramsTuple?: []; params?: {} }
    'resident.bookings.attachments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.tickets.store': { paramsTuple?: []; params?: {} }
    'resident.tickets.comments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.payments.report': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'resident.payments.attachments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.surveys.vote': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.parking.apply': { paramsTuple?: []; params?: {} }
    'resident.parking.withdraw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.parking.accept': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.parking.decline': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.store': { paramsTuple?: []; params?: {} }
    'announcements.emailPreview': { paramsTuple?: []; params?: {} }
    'announcements.publish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.unpublish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.attachments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'amenities.store': { paramsTuple?: []; params?: {} }
    'bookings.quote': { paramsTuple?: []; params?: {} }
    'bookings.store': { paramsTuple?: []; params?: {} }
    'bookings.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.deposit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.attachments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.store': { paramsTuple?: []; params?: {} }
    'documents.versions.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.publish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.unpublish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.folders.store': { paramsTuple?: []; params?: {} }
    'surveys.store': { paramsTuple?: []; params?: {} }
    'surveys.publish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tickets.write.comments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tickets.write.attachments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'visitorParking.write.stays.store': { paramsTuple?: []; params?: {} }
    'visitorParking.write.stays.exit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'visitorParking.write.stays.receipt': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.spots.store': { paramsTuple?: []; params?: {} }
    'parking.manage.spots.batch': { paramsTuple?: []; params?: {} }
    'parking.manage.spots.import': { paramsTuple?: []; params?: {} }
    'parking.manage.assignments.store': { paramsTuple?: []; params?: {} }
    'parking.manage.assignments.end': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.lotteries.store': { paramsTuple?: []; params?: {} }
    'parking.manage.lotteries.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.lotteries.draw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.lotteries.offer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.lotteries.apply': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.applications.withdraw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.applications.assign': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'billing.tokens.nequi': { paramsTuple?: []; params?: {} }
    'billing.tokens.daviplata': { paramsTuple?: []; params?: {} }
    'billing.tokens.daviplataOtp': { paramsTuple?: []; params?: {} }
    'billing.tokens.bancolombia': { paramsTuple?: []; params?: {} }
    'billing.pay': { paramsTuple?: []; params?: {} }
    'billing.emailPacks': { paramsTuple?: []; params?: {} }
    'webhooks.wompi': { paramsTuple?: []; params?: {} }
    'buildings.store': { paramsTuple?: []; params?: {} }
    'units.store': { paramsTuple?: []; params?: {} }
    'occupants.store': { paramsTuple: [ParamValue]; params: {'unitId': ParamValue} }
    'imports.property.preview': { paramsTuple?: []; params?: {} }
    'imports.property.plan': { paramsTuple?: []; params?: {} }
    'imports.property.apply': { paramsTuple?: []; params?: {} }
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
    'finance.write.attachments.store': { paramsTuple: [ParamValue,ParamValue]; params: {'ownerType': ParamValue,'ownerId': ParamValue} }
  }
  PATCH: {
    'profile.update': { paramsTuple?: []; params?: {} }
    'resident.vehicles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.pets.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.household.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tickets.write.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'visitorParking.write.stays.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.spots.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.assignments.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.lotteries.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'profile.notifications.preferences.update': { paramsTuple?: []; params?: {} }
    'announcements.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.image.set': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'amenities.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.folders.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'surveys.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'visitorParking.settings.update': { paramsTuple?: []; params?: {} }
    'parking.manage.settings.update': { paramsTuple?: []; params?: {} }
    'billing.autoRenew': { paramsTuple?: []; params?: {} }
    'billing.paymentMethod.save': { paramsTuple?: []; params?: {} }
    'finance.write.settings.update': { paramsTuple?: []; params?: {} }
    'finance.write.concepts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.modules.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.vendors.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.budgets.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'profile.sessions.destroy': { paramsTuple: [ParamValue]; params: {'sessionId': ParamValue} }
    'profile.sessions.destroyOthers': { paramsTuple?: []; params?: {} }
    'profile.push.destroy': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'resident.vehicles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.pets.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.household.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.visits.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.bookings.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'resident.attachments.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.image.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'announcements.attachments.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'amenities.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.attachments.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.versions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.folders.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'surveys.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tickets.write.attachments.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parking.manage.spots.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'billing.paymentMethod.destroy': { paramsTuple?: []; params?: {} }
    'buildings.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'units.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'occupants.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'unitId': ParamValue,'id': ParamValue} }
    'finance.write.modules.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.budgets.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.write.attachments.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}