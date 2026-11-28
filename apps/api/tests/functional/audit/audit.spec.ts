import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import AuditLog from '#models/tenants/audit_log'
import Unit from '#models/property/unit'
import { withoutAudit } from '#services/audit/context'
import { dataOf, expectStatus, financeSetup, memberApi } from '../finance/helpers.js'

type Entry = {
  id: string
  action: string
  type: string
  module: string
  label: string | null
  user: { id: string; fullName: string } | null
  ipAddress: string | null
  fields: string[]
}

test.group('Audit log · recording', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('census changes record who, from where and what changed', async ({ client, assert }) => {
    const s = await financeSetup(client, { fees: false })
    const created = await dataOf(
      s.api.post('/units', { code: '201', type: 'apartment', ownershipCoefficient: 0.1 })
    )
    await expectStatus(s.api.patch(`/units/${created.id}`, { ownershipCoefficient: 0.15 }), 200)

    const logs = await AuditLog.query()
      .where('tenant_id', s.tenant.id)
      .where('auditable_id', created.id)
      .orderBy('created_at')
    assert.deepEqual(
      logs.map((log) => log.action),
      ['created', 'updated']
    )
    const [create, update] = logs
    assert.equal(create!.userId, s.user.id)
    assert.isNotNull(create!.ipAddress)
    assert.equal((create!.changes as any).label, '201')
    assert.equal((create!.changes as any).after.code, '201')
    assert.deepEqual((update!.changes as any).before, { ownershipCoefficient: '0.100000' })
    assert.deepEqual((update!.changes as any).after, { ownershipCoefficient: '0.150000' })
  })

  test('payments are recorded, the charges they pay are not', async ({ client, assert }) => {
    const s = await financeSetup(client)
    await expectStatus(s.api.post('/finance/periods/generate', { period: '2026-01' }), 200)
    const payment = await dataOf(
      s.api.post('/finance/payments', {
        unitId: s.units.a.id,
        amount: 500_000,
        paidOn: '2026-01-10',
        method: 'cash',
        cashAccountId: s.bankId,
      })
    )
    const types = await AuditLog.query()
      .where('tenant_id', s.tenant.id)
      .select('auditable_type', 'action', 'auditable_id')
    const of = (type: string) => types.filter((log) => log.auditableType === type)
    assert.lengthOf(
      of('payments').filter((log) => log.auditableId === payment.id),
      1
    )
    assert.lengthOf(of('billing_periods'), 1)
    // Billing creates the charges in bulk and the payment moves their balance
    assert.lengthOf(of('charges'), 0)
    // The chart of accounts of the first visit to finance is not an entry per
    // account: only the auxiliary account of the bank created by the setup
    assert.lengthOf(of('ledger_accounts'), 1)
    assert.lengthOf(of('fee_schedules'), 1)
    assert.lengthOf(of('cash_accounts'), 1)
  })

  test('access changes are recorded without the invitation secrets', async ({ client, assert }) => {
    const s = await financeSetup(client, { fees: false })
    const member = await dataOf(
      s.api.post('/members', {
        fullName: 'Ana Revisora',
        email: 'ana@example.com',
        role: 'fiscal_reviewer',
      })
    )
    const logs = await AuditLog.query()
      .where('tenant_id', s.tenant.id)
      .where('auditable_type', 'enrollments')
    assert.isAtLeast(logs.length, 1)
    const created = logs.find(
      (log) => log.action === 'created' && (log.changes as any).label.includes('Ana')
    )!
    assert.include((created.changes as any).label, 'Ana Revisora')
    assert.notProperty((created.changes as any).after, 'invitationTokenHash')
    assert.exists(member)
  })

  test('nothing is recorded inside withoutAudit', async ({ client, assert }) => {
    const s = await financeSetup(client, { fees: false })
    await withoutAudit(() =>
      Unit.create({
        tenantId: s.tenant.id,
        code: 'X-1',
        type: 'storage',
        ownershipCoefficient: '0',
        status: 'vacant',
      })
    )
    const logs = await AuditLog.query()
      .where('tenant_id', s.tenant.id)
      .where('auditable_type', 'units')
    // The four units of the setup, not X-1
    assert.lengthOf(logs, 4)
    assert.isTrue(logs.every((log) => log.userId === null))
  })
})

test.group('Audit log · consultation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the accountant only sees finance; staff sees nothing', async ({ client, assert }) => {
    const s = await financeSetup(client, { fees: false })
    await expectStatus(s.api.post('/units', { code: '201', type: 'apartment' }), 201)
    const accountant = await memberApi(client, s.tenant, 'accountant')
    const reviewer = await memberApi(client, s.tenant, 'fiscal_reviewer')
    const staff = await memberApi(client, s.tenant, 'staff')

    const all: Entry[] = await dataOf(reviewer.api.get('/audit-logs', { perPage: 100 }))
    assert.isTrue(all.some((entry) => entry.module === 'census'))
    assert.isTrue(all.some((entry) => entry.module === 'finance'))

    const finance: Entry[] = await dataOf(accountant.api.get('/audit-logs', { perPage: 100 }))
    assert.isAbove(finance.length, 0)
    assert.isTrue(finance.every((entry) => entry.module === 'finance'))
    const census: Entry[] = await dataOf(accountant.api.get('/audit-logs', { module: 'census' }))
    assert.lengthOf(census, 0)

    await expectStatus(staff.api.get('/audit-logs'), 403)
  })

  test('filters, detail and another conjunto', async ({ client, assert }) => {
    const s = await financeSetup(client, { fees: false })
    const other = await financeSetup(client, { fees: false })
    const unit = await dataOf(s.api.post('/units', { code: '777', type: 'apartment' }))
    await expectStatus(s.api.patch(`/units/${unit.id}`, { floor: 7 }), 200)

    const found: Entry[] = await dataOf(s.api.get('/audit-logs', { search: '777' }))
    assert.lengthOf(found, 2)
    const updated: Entry[] = await dataOf(
      s.api.get('/audit-logs', { search: '777', action: 'updated' })
    )
    assert.lengthOf(updated, 1)
    assert.deepEqual(updated[0]!.fields, ['floor'])
    assert.equal(updated[0]!.user!.id, s.user.id)
    const byRecord: Entry[] = await dataOf(s.api.get('/audit-logs', { recordId: unit.id }))
    assert.lengthOf(byRecord, 2)

    const detail = await dataOf(s.api.get(`/audit-logs/${updated[0]!.id}`))
    assert.deepEqual(detail.changes.after, { floor: 7 })

    // Other conjuntos do not see it
    await expectStatus(other.api.get(`/audit-logs/${updated[0]!.id}`), 404)
    const theirs: Entry[] = await dataOf(other.api.get('/audit-logs', { search: '777' }))
    assert.lengthOf(theirs, 0)

    const file = await s.api.get('/audit-logs/export', { format: 'csv', search: '777' })
    file.assertStatus(200)
    assert.include(file.text(), 'Fecha y hora;Persona;Acción')
    assert.include(file.text(), 'Modificó')
  })
})
