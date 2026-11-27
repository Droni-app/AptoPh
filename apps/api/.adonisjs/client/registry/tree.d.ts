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
