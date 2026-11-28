/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  drive: {
    fs: {
      serve: typeof routes['drive.fs.serve']
    }
  }
  auth: {
    login: typeof routes['auth.login']
    signup: typeof routes['auth.signup']
    logout: typeof routes['auth.logout']
    password: {
      forgot: typeof routes['auth.password.forgot']
      reset: typeof routes['auth.password.reset']
    }
    email: {
      verify: typeof routes['auth.email.verify']
    }
  }
  invitations: {
    show: typeof routes['invitations.show']
    accept: typeof routes['invitations.accept']
  }
  profile: {
    show: typeof routes['profile.show']
    update: typeof routes['profile.update']
    password: typeof routes['profile.password']
    sessions: {
      index: typeof routes['profile.sessions.index']
      destroy: typeof routes['profile.sessions.destroy']
      destroyOthers: typeof routes['profile.sessions.destroyOthers']
    }
    email: {
      verification: typeof routes['profile.email.verification']
    }
    tenants: typeof routes['profile.tenants']
    notifications: {
      preferences: typeof routes['profile.notifications.preferences'] & {
        update: typeof routes['profile.notifications.preferences.update']
      }
    }
    push: {
      store: typeof routes['profile.push.store']
      destroy: typeof routes['profile.push.destroy']
    }
  }
  notifications: {
    index: typeof routes['notifications.index']
    unread: typeof routes['notifications.unread']
    readAll: typeof routes['notifications.readAll']
    read: typeof routes['notifications.read']
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
      availability: typeof routes['resident.amenities.availability']
    }
    bookings: {
      index: typeof routes['resident.bookings.index']
      quote: typeof routes['resident.bookings.quote']
      attachments: {
        url: typeof routes['resident.bookings.attachments.url']
        store: typeof routes['resident.bookings.attachments.store']
      }
      show: typeof routes['resident.bookings.show']
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
    statement: typeof routes['resident.statement']
    payments: {
      report: typeof routes['resident.payments.report']
      index: typeof routes['resident.payments.index']
      attachments: {
        store: typeof routes['resident.payments.attachments.store']
      }
    }
    attachments: {
      url: typeof routes['resident.attachments.url']
      destroy: typeof routes['resident.attachments.destroy']
    }
    announcements: {
      index: typeof routes['resident.announcements.index']
      attachments: {
        url: typeof routes['resident.announcements.attachments.url']
      }
      show: typeof routes['resident.announcements.show']
    }
    documents: {
      index: typeof routes['resident.documents.index']
      folders: typeof routes['resident.documents.folders']
      files: {
        url: typeof routes['resident.documents.files.url']
      }
      show: typeof routes['resident.documents.show']
    }
    surveys: {
      index: typeof routes['resident.surveys.index']
      show: typeof routes['resident.surveys.show']
      vote: typeof routes['resident.surveys.vote']
    }
    parking: {
      show: typeof routes['resident.parking.show']
      apply: typeof routes['resident.parking.apply']
      withdraw: typeof routes['resident.parking.withdraw']
      accept: typeof routes['resident.parking.accept']
      decline: typeof routes['resident.parking.decline']
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
    store: typeof routes['members.store']
    update: typeof routes['members.update']
    status: typeof routes['members.status']
    invitation: typeof routes['members.invitation']
  }
  subscription: {
    show: typeof routes['subscription.show']
  }
  emailQuota: {
    show: typeof routes['emailQuota.show']
  }
  settings: {
    tenant: typeof routes['settings.tenant'] & {
      update: typeof routes['settings.tenant.update']
    }
  }
  announcements: {
    index: typeof routes['announcements.index']
    attachments: {
      url: typeof routes['announcements.attachments.url']
      store: typeof routes['announcements.attachments.store']
      destroy: typeof routes['announcements.attachments.destroy']
    }
    show: typeof routes['announcements.show']
    readers: typeof routes['announcements.readers']
    store: typeof routes['announcements.store']
    emailPreview: typeof routes['announcements.emailPreview']
    update: typeof routes['announcements.update']
    publish: typeof routes['announcements.publish']
    unpublish: typeof routes['announcements.unpublish']
    destroy: typeof routes['announcements.destroy']
    image: {
      set: typeof routes['announcements.image.set']
      destroy: typeof routes['announcements.image.destroy']
    }
  }
  amenities: {
    index: typeof routes['amenities.index']
    store: typeof routes['amenities.store']
    update: typeof routes['amenities.update']
    destroy: typeof routes['amenities.destroy']
  }
  bookings: {
    calendar: typeof routes['bookings.calendar']
    stats: typeof routes['bookings.stats']
    index: typeof routes['bookings.index']
    attachments: {
      url: typeof routes['bookings.attachments.url']
      store: typeof routes['bookings.attachments.store']
      destroy: typeof routes['bookings.attachments.destroy']
    }
    show: typeof routes['bookings.show']
    quote: typeof routes['bookings.quote']
    store: typeof routes['bookings.store']
    approve: typeof routes['bookings.approve']
    reject: typeof routes['bookings.reject']
    cancel: typeof routes['bookings.cancel']
    deposit: typeof routes['bookings.deposit']
  }
  documents: {
    index: typeof routes['documents.index']
    folders: typeof routes['documents.folders'] & {
      store: typeof routes['documents.folders.store']
      update: typeof routes['documents.folders.update']
      destroy: typeof routes['documents.folders.destroy']
    }
    files: {
      url: typeof routes['documents.files.url']
    }
    show: typeof routes['documents.show']
    stats: typeof routes['documents.stats']
    store: typeof routes['documents.store']
    update: typeof routes['documents.update']
    destroy: typeof routes['documents.destroy']
    versions: {
      store: typeof routes['documents.versions.store']
      destroy: typeof routes['documents.versions.destroy']
    }
    publish: typeof routes['documents.publish']
    unpublish: typeof routes['documents.unpublish']
    archive: typeof routes['documents.archive']
    restore: typeof routes['documents.restore']
  }
  surveys: {
    index: typeof routes['surveys.index']
    stats: typeof routes['surveys.stats']
    show: typeof routes['surveys.show']
    voters: typeof routes['surveys.voters']
    store: typeof routes['surveys.store']
    update: typeof routes['surveys.update']
    publish: typeof routes['surveys.publish']
    destroy: typeof routes['surveys.destroy']
  }
  tickets: {
    index: typeof routes['tickets.index']
    stats: typeof routes['tickets.stats']
    assignees: typeof routes['tickets.assignees']
    attachments: {
      url: typeof routes['tickets.attachments.url']
    }
    show: typeof routes['tickets.show']
    write: {
      update: typeof routes['tickets.write.update']
      comments: {
        store: typeof routes['tickets.write.comments.store']
      }
      attachments: {
        store: typeof routes['tickets.write.attachments.store']
        destroy: typeof routes['tickets.write.attachments.destroy']
      }
    }
  }
  visitorParking: {
    summary: typeof routes['visitorParking.summary']
    settings: typeof routes['visitorParking.settings'] & {
      update: typeof routes['visitorParking.settings.update']
    }
    lookup: typeof routes['visitorParking.lookup']
    stays: {
      index: typeof routes['visitorParking.stays.index']
      show: typeof routes['visitorParking.stays.show']
    }
    write: {
      stays: {
        store: typeof routes['visitorParking.write.stays.store']
        update: typeof routes['visitorParking.write.stays.update']
        exit: typeof routes['visitorParking.write.stays.exit']
        receipt: typeof routes['visitorParking.write.stays.receipt']
      }
    }
  }
  parking: {
    summary: typeof routes['parking.summary']
    spots: {
      index: typeof routes['parking.spots.index']
    }
    assignments: {
      index: typeof routes['parking.assignments.index']
    }
    lookup: typeof routes['parking.lookup']
    manage: {
      read: {
        settings: typeof routes['parking.manage.read.settings']
        eligibility: typeof routes['parking.manage.read.eligibility']
      }
      settings: {
        update: typeof routes['parking.manage.settings.update']
      }
      spots: {
        store: typeof routes['parking.manage.spots.store']
        batch: typeof routes['parking.manage.spots.batch']
        import: typeof routes['parking.manage.spots.import']
        update: typeof routes['parking.manage.spots.update']
        destroy: typeof routes['parking.manage.spots.destroy']
      }
      assignments: {
        store: typeof routes['parking.manage.assignments.store']
        update: typeof routes['parking.manage.assignments.update']
        end: typeof routes['parking.manage.assignments.end']
      }
      lotteries: {
        store: typeof routes['parking.manage.lotteries.store']
        update: typeof routes['parking.manage.lotteries.update']
        cancel: typeof routes['parking.manage.lotteries.cancel']
        draw: typeof routes['parking.manage.lotteries.draw']
        offer: typeof routes['parking.manage.lotteries.offer']
        apply: typeof routes['parking.manage.lotteries.apply']
      }
      applications: {
        withdraw: typeof routes['parking.manage.applications.withdraw']
        assign: typeof routes['parking.manage.applications.assign']
      }
    }
    lotteries: {
      read: {
        lotteries: {
          index: typeof routes['parking.lotteries.read.lotteries.index']
          show: typeof routes['parking.lotteries.read.lotteries.show']
          applications: typeof routes['parking.lotteries.read.lotteries.applications']
        }
      }
    }
  }
  billing: {
    show: typeof routes['billing.show']
    config: typeof routes['billing.config']
    charges: {
      show: typeof routes['billing.charges.show']
    }
    tokens: {
      show: typeof routes['billing.tokens.show']
      nequi: typeof routes['billing.tokens.nequi']
      daviplata: typeof routes['billing.tokens.daviplata']
      daviplataOtp: typeof routes['billing.tokens.daviplataOtp']
      bancolombia: typeof routes['billing.tokens.bancolombia']
    }
    autoRenew: typeof routes['billing.autoRenew']
    paymentMethod: {
      destroy: typeof routes['billing.paymentMethod.destroy']
      save: typeof routes['billing.paymentMethod.save']
    }
    pay: typeof routes['billing.pay']
    emailPacks: typeof routes['billing.emailPacks']
  }
  webhooks: {
    wompi: typeof routes['webhooks.wompi']
  }
  public: {
    announcementImages: {
      show: typeof routes['public.announcementImages.show']
    }
  }
  imports: {
    property: {
      preview: typeof routes['imports.property.preview']
      plan: typeof routes['imports.property.plan']
      apply: typeof routes['imports.property.apply']
    }
  }
  finance: {
    summary: typeof routes['finance.summary']
    settings: typeof routes['finance.settings']
    accounts: {
      index: typeof routes['finance.accounts.index']
    }
    concepts: {
      index: typeof routes['finance.concepts.index']
    }
    cash: {
      index: typeof routes['finance.cash.index']
    }
    periods: {
      index: typeof routes['finance.periods.index']
      preview: typeof routes['finance.periods.preview']
      show: typeof routes['finance.periods.show']
    }
    charges: {
      index: typeof routes['finance.charges.index']
      show: typeof routes['finance.charges.show']
    }
    recurring: {
      index: typeof routes['finance.recurring.index']
    }
    schedules: {
      index: typeof routes['finance.schedules.index']
    }
    modules: {
      index: typeof routes['finance.modules.index']
    }
    payments: {
      index: typeof routes['finance.payments.index']
      show: typeof routes['finance.payments.show']
    }
    vendors: {
      index: typeof routes['finance.vendors.index']
      show: typeof routes['finance.vendors.show']
    }
    bills: {
      index: typeof routes['finance.bills.index']
      show: typeof routes['finance.bills.show']
    }
    egresos: {
      index: typeof routes['finance.egresos.index']
      show: typeof routes['finance.egresos.show']
    }
    budgets: {
      index: typeof routes['finance.budgets.index']
      show: typeof routes['finance.budgets.show']
    }
    journal: {
      index: typeof routes['finance.journal.index']
      show: typeof routes['finance.journal.show']
    }
    units: {
      statement: typeof routes['finance.units.statement']
    }
    aging: {
      receivables: typeof routes['finance.aging.receivables']
      payables: typeof routes['finance.aging.payables']
    }
    reports: {
      trialBalance: typeof routes['finance.reports.trialBalance']
      incomeStatement: typeof routes['finance.reports.incomeStatement']
      balanceSheet: typeof routes['finance.reports.balanceSheet']
      ledger: typeof routes['finance.reports.ledger']
    }
    attachments: {
      index: typeof routes['finance.attachments.index']
      url: typeof routes['finance.attachments.url']
    }
    write: {
      settings: {
        update: typeof routes['finance.write.settings.update']
      }
      accounts: {
        store: typeof routes['finance.write.accounts.store']
        update: typeof routes['finance.write.accounts.update']
      }
      concepts: {
        store: typeof routes['finance.write.concepts.store']
        update: typeof routes['finance.write.concepts.update']
      }
      cash: {
        store: typeof routes['finance.write.cash.store']
        update: typeof routes['finance.write.cash.update']
      }
      transfers: {
        store: typeof routes['finance.write.transfers.store']
      }
      periods: {
        generate: typeof routes['finance.write.periods.generate']
        close: typeof routes['finance.write.periods.close']
        reopen: typeof routes['finance.write.periods.reopen']
      }
      charges: {
        store: typeof routes['finance.write.charges.store']
        cancel: typeof routes['finance.write.charges.cancel']
        creditNote: typeof routes['finance.write.charges.creditNote']
      }
      recurring: {
        store: typeof routes['finance.write.recurring.store']
        end: typeof routes['finance.write.recurring.end']
      }
      schedules: {
        preview: typeof routes['finance.write.schedules.preview']
        store: typeof routes['finance.write.schedules.store']
      }
      modules: {
        store: typeof routes['finance.write.modules.store']
        update: typeof routes['finance.write.modules.update']
        destroy: typeof routes['finance.write.modules.destroy']
      }
      payments: {
        store: typeof routes['finance.write.payments.store']
        confirm: typeof routes['finance.write.payments.confirm']
        reject: typeof routes['finance.write.payments.reject']
        reverse: typeof routes['finance.write.payments.reverse']
      }
      vendors: {
        store: typeof routes['finance.write.vendors.store']
        update: typeof routes['finance.write.vendors.update']
      }
      bills: {
        store: typeof routes['finance.write.bills.store']
        cancel: typeof routes['finance.write.bills.cancel']
      }
      egresos: {
        store: typeof routes['finance.write.egresos.store']
        reverse: typeof routes['finance.write.egresos.reverse']
      }
      budgets: {
        store: typeof routes['finance.write.budgets.store']
        update: typeof routes['finance.write.budgets.update']
        approve: typeof routes['finance.write.budgets.approve']
        reopen: typeof routes['finance.write.budgets.reopen']
        destroy: typeof routes['finance.write.budgets.destroy']
      }
      journal: {
        store: typeof routes['finance.write.journal.store']
        reverse: typeof routes['finance.write.journal.reverse']
      }
      attachments: {
        store: typeof routes['finance.write.attachments.store']
        destroy: typeof routes['finance.write.attachments.destroy']
      }
    }
  }
}
