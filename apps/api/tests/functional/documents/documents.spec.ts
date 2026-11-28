import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import drive from '@adonisjs/drive/services/main'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import type { EnrollmentRole } from '@aptoph/shared'
import UnitOccupant from '#models/property/unit_occupant'
import type Unit from '#models/property/unit'
import type Tenant from '#models/tenants/tenant'
import type User from '#models/auth/user'
import { DocumentsService } from '#services/documents/documents'
import { createMember } from '#tests/helpers'
import { apiFor, dataOf, expectStatus, financeSetup } from '../finance/helpers.js'

const PDF = Buffer.from('%PDF-1.4\n%%EOF\n')

type Fields = Record<string, string | string[] | boolean | null | undefined>

/** POST a multipart form with a file */
function upload(
  client: ApiClient,
  tenant: Tenant,
  user: User,
  path: string,
  fields: Fields,
  filename = 'acta.pdf'
) {
  let request = client
    .post(`/api/v1${path}`)
    .loginAs(user)
    .header('X-Tenant-Id', tenant.id)
    .file('file', PDF, { filename })
  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) for (const item of value) request = request.field(`${name}[]`, item)
    else request = request.field(name, String(value))
  }
  return request as unknown as Promise<any>
}

async function member(
  client: ApiClient,
  tenant: Tenant,
  role: EnrollmentRole,
  occupancy?: { unit: Unit; relationship: 'owner' | 'renter' }
) {
  const { user } = await createMember(role, tenant)
  if (occupancy) {
    await UnitOccupant.create({
      tenantId: tenant.id,
      unitId: occupancy.unit.id,
      userId: user.id,
      fullName: user.fullName,
      relationship: occupancy.relationship,
      isPrimaryContact: occupancy.relationship === 'owner',
    })
  }
  return { user, api: apiFor(client, tenant, user) }
}

async function setup(client: ApiClient) {
  const finance = await financeSetup(client, { fees: false })
  const { tenant, units } = finance
  return {
    ...finance,
    admin: { user: finance.user, api: finance.api },
    owner: await member(client, tenant, 'resident', { unit: units.a, relationship: 'owner' }),
    otherOwner: await member(client, tenant, 'resident', { unit: units.b, relationship: 'owner' }),
    renter: await member(client, tenant, 'resident', { unit: units.c, relationship: 'renter' }),
    council: await member(client, tenant, 'council_member'),
    fiscal: await member(client, tenant, 'fiscal_reviewer'),
    accountant: await member(client, tenant, 'accountant'),
    staff: await member(client, tenant, 'staff'),
    guard: await member(client, tenant, 'security_guard'),
  }
}
type Setup = Awaited<ReturnType<typeof setup>>

/** Creates and publishes a document as the administration */
async function publish(client: ApiClient, s: Setup, fields: Fields) {
  const response = await upload(client, s.tenant, s.admin.user, '/documents', {
    category: 'other',
    publish: true,
    ...fields,
  })
  response.assertStatus(201)
  return response.body().data as { id: string; file: { id: string } }
}

const titles = (rows: Array<{ title: string }>) => rows.map((row) => row.title).sort()

test.group('Documents · who sees what', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    drive.fake()
    return () => drive.restore()
  })

  test('each visibility reaches exactly its people', async ({ client, assert }) => {
    mail.fake()
    const s = await setup(client)
    await publish(client, s, { title: 'Manual de convivencia', visibility: 'community' })
    await publish(client, s, { title: 'Acta de asamblea', visibility: 'owners' })
    await publish(client, s, { title: 'Acta de consejo', visibility: 'council' })
    await publish(client, s, { title: 'Protocolo de portería', visibility: 'staff' })
    await publish(client, s, { title: 'Contrato en negociación', visibility: 'private' })
    await publish(client, s, {
      title: 'Certificado de tradición 101',
      visibility: 'units',
      unitIds: [s.units.a.id],
    })
    // A draft is nobody's but the administration's
    await expectStatus(
      upload(client, s.tenant, s.admin.user, '/documents', {
        title: 'Borrador de reglamento',
        category: 'bylaws',
        visibility: 'community',
      }),
      201
    )

    const portal = async (who: { api: Setup['admin']['api'] }) =>
      titles(await dataOf(who.api.get('/resident/documents')))
    const office = async (who: { api: Setup['admin']['api'] }) =>
      titles(await dataOf(who.api.get('/documents')))

    assert.deepEqual(await portal(s.renter), ['Manual de convivencia'])
    assert.deepEqual(await portal(s.otherOwner), ['Acta de asamblea', 'Manual de convivencia'])
    assert.deepEqual(await portal(s.owner), [
      'Acta de asamblea',
      'Certificado de tradición 101',
      'Manual de convivencia',
    ])
    assert.deepEqual(await office(s.council), [
      'Acta de asamblea',
      'Acta de consejo',
      'Manual de convivencia',
    ])
    assert.deepEqual(await office(s.fiscal), [
      'Acta de asamblea',
      'Acta de consejo',
      'Manual de convivencia',
    ])
    assert.deepEqual(await office(s.accountant), ['Acta de asamblea', 'Manual de convivencia'])
    assert.deepEqual(await office(s.staff), ['Manual de convivencia', 'Protocolo de portería'])
    assert.deepEqual(await office(s.guard), ['Manual de convivencia', 'Protocolo de portería'])
    assert.lengthOf(await dataOf(s.admin.api.get('/documents')), 7)

    // Residents and staff never get the management fields
    const [row] = await dataOf(s.renter.api.get('/resident/documents'))
    assert.notProperty(row, 'visibility')
    assert.notProperty(row, 'units')
  })

  test('a hidden document and its file answer 404; opening one is logged', async ({
    client,
    assert,
  }) => {
    mail.fake()
    const s = await setup(client)
    const council = await publish(client, s, { title: 'Acta de consejo', visibility: 'council' })
    const bylaws = await publish(client, s, { title: 'Reglamento', visibility: 'community' })

    await expectStatus(s.owner.api.get(`/resident/documents/${council.id}`), 404)
    await expectStatus(s.owner.api.get(`/resident/documents/files/${council.file.id}/url`), 404)
    await expectStatus(s.staff.api.get(`/documents/files/${council.file.id}/url`), 404)
    // Managing is only for the administration
    await expectStatus(s.council.api.post(`/documents/${bylaws.id}/archive`, {}), 403)
    await expectStatus(s.owner.api.get('/documents'), 403)

    const link = await dataOf(
      s.renter.api.get(`/resident/documents/files/${bylaws.file.id}/url`, { download: true })
    )
    assert.isString(link.url)
    await dataOf(s.council.api.get(`/documents/files/${council.file.id}/url`))

    const detail = await dataOf(s.admin.api.get(`/documents/${bylaws.id}`))
    assert.equal(detail.viewCount, 1)
    assert.equal(detail.access[0].action, 'download')
    assert.equal(detail.access[0].user.id, s.renter.user.id)

    // Another conjunto does not exist for this one
    const { user: stranger } = await createMember('administrator')
    await expectStatus(
      client
        .get(`/api/v1/documents/${bylaws.id}`)
        .loginAs(stranger)
        .header('X-Tenant-Id', s.tenant.id) as unknown as Promise<any>,
      403
    )
    const other = await createMember('administrator')
    await expectStatus(apiFor(client, other.tenant, other.user).get(`/documents/${bylaws.id}`), 404)
  })

  test('publishing notifies only who can see it', async ({ client, assert }) => {
    mail.fake()
    const s = await setup(client)
    const draft = await dataOf(
      upload(client, s.tenant, s.admin.user, '/documents', {
        title: `Estados financieros ${DateTime.now().year}`,
        category: 'financial_statement',
        visibility: 'owners',
      })
    )
    assert.equal(draft.status, 'draft')
    await expectStatus(s.owner.api.get(`/resident/documents/${draft.id}`), 404)

    const published = await s.admin.api.post(`/documents/${draft.id}/publish`, { notify: true })
    published.assertStatus(200)
    // Two owners and the council, fiscal reviewer and accountant
    assert.equal(published.body().notified, 5)
    await expectStatus(s.admin.api.post(`/documents/${draft.id}/publish`, { notify: true }), 409)

    const bell = async (who: { api: Setup['admin']['api'] }, app: 'web' | 'backoffice') => {
      const rows: Array<{ type: string }> = await dataOf(who.api.get('/notifications', { app }))
      return rows.map((n) => n.type)
    }
    assert.include(await bell(s.owner, 'web'), 'document.published')
    assert.include(await bell(s.council, 'backoffice'), 'document.published')
    assert.notInclude(await bell(s.renter, 'web'), 'document.published')
    assert.notInclude(await bell(s.staff, 'backoffice'), 'document.published')
  })
})

test.group('Documents · management', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    drive.fake()
    return () => drive.restore()
  })

  test('fields are validated', async ({ client }) => {
    mail.fake()
    const s = await setup(client)
    const base = { title: 'Título', category: 'deed', visibility: 'units' }
    // `units` needs the units
    await expectStatus(upload(client, s.tenant, s.admin.user, '/documents', base), 422)
    await expectStatus(
      upload(client, s.tenant, s.admin.user, '/documents', { ...base, unitIds: [s.tenant.id] }),
      422
    )
    // Not a document format
    await expectStatus(
      upload(
        client,
        s.tenant,
        s.admin.user,
        '/documents',
        { ...base, visibility: 'private' },
        'virus.exe'
      ),
      422
    )
    await expectStatus(
      upload(client, s.tenant, s.admin.user, '/documents', {
        ...base,
        visibility: 'private',
        documentDate: '2026-05-01',
        expiresOn: '2026-01-01',
      }),
      422
    )
  })

  test('versions: residents only open the current one', async ({ client, assert }) => {
    mail.fake()
    const s = await setup(client)
    const doc = await publish(client, s, { title: 'Reglamento', visibility: 'community' })
    const first = doc.file.id

    const response = await upload(
      client,
      s.tenant,
      s.admin.user,
      `/documents/${doc.id}/versions`,
      {},
      'reglamento-2026.pdf'
    )
    response.assertStatus(201)
    const updated = response.body().data
    assert.equal(updated.file.version, 2)
    assert.equal(updated.file.fileName, 'reglamento-2026.pdf')
    assert.lengthOf(updated.versions, 2)

    const seen = await dataOf(s.owner.api.get(`/resident/documents/${doc.id}`))
    assert.equal(seen.file.version, 2)
    assert.notProperty(seen, 'versions')
    await expectStatus(s.owner.api.get(`/resident/documents/files/${first}/url`), 404)
    await expectStatus(s.admin.api.get(`/documents/files/${first}/url`), 200)

    // The current one can go while there is another; the last one cannot
    const back = await dataOf(
      client
        .delete(`/api/v1/documents/versions/${updated.file.id}`)
        .loginAs(s.admin.user)
        .header('X-Tenant-Id', s.tenant.id) as unknown as Promise<any>
    )
    assert.equal(back.file.id, first)
    await expectStatus(
      client
        .delete(`/api/v1/documents/versions/${first}`)
        .loginAs(s.admin.user)
        .header('X-Tenant-Id', s.tenant.id) as unknown as Promise<any>,
      409
    )
  })

  test('folders nest, keep unique names and only empty ones go', async ({ client, assert }) => {
    mail.fake()
    const s = await setup(client)
    const folder = (name: string, parentId: string | null = null) =>
      s.admin.api.post('/documents/folders', { name, parentId })
    const assemblies = await dataOf(folder('Asambleas'))
    const year = await dataOf(folder('2026', assemblies.id))
    const council = await dataOf(folder('Consejo'))
    await expectStatus(folder('asambleas'), 422)
    await expectStatus(folder('2026', assemblies.id), 422)
    await expectStatus(folder('2026'), 201) // another parent
    // A folder cannot go inside itself or its children
    await expectStatus(
      s.admin.api.put(`/documents/folders/${assemblies.id}`, {
        name: 'Asambleas',
        parentId: year.id,
      }),
      422
    )

    await publish(client, s, { title: 'Acta 2026', visibility: 'owners', folderId: year.id })
    await publish(client, s, { title: 'Acta consejo', visibility: 'council', folderId: council.id })

    // Residents see the folders with something for them, and their parents
    const theirs = await dataOf(s.owner.api.get('/resident/documents/folders'))
    assert.sameMembers(
      theirs.map((f: { name: string }) => f.name),
      ['Asambleas', '2026']
    )
    const inside = await dataOf(s.owner.api.get('/resident/documents', { folder: year.id }))
    assert.deepEqual(titles(inside), ['Acta 2026'])

    const remove = (id: string) =>
      client
        .delete(`/api/v1/documents/folders/${id}`)
        .loginAs(s.admin.user)
        .header('X-Tenant-Id', s.tenant.id) as unknown as Promise<any>
    await expectStatus(remove(assemblies.id), 409)
    await expectStatus(remove(council.id), 409)
  })

  test('archive, delete and the expiry warnings', async ({ client, assert }) => {
    mail.fake()
    const s = await setup(client)
    const today = DateTime.now().setZone(s.tenant.timezone).startOf('day')
    const contract = await publish(client, s, {
      title: 'Contrato de aseo',
      category: 'contract',
      visibility: 'community',
      expiresOn: today.plus({ days: 6 }).toISODate()!,
    })
    await publish(client, s, {
      title: 'Póliza',
      category: 'policy',
      visibility: 'council',
      expiresOn: today.plus({ days: 90 }).toISODate()!,
    })

    const stats = await dataOf(s.admin.api.get('/documents-stats'))
    assert.equal(stats.total, 2)
    assert.equal(stats.expiring, 1)
    const expiring = await dataOf(s.admin.api.get('/documents', { expiring: true }))
    assert.deepEqual(titles(expiring), ['Contrato de aseo'])

    const service = new DocumentsService(s.tenant)
    assert.equal(await service.remindExpiring(), 1)
    // Once per warning
    assert.equal(await service.remindExpiring(), 0)
    const bell = await dataOf(s.admin.api.get('/notifications', { app: 'backoffice' }))
    assert.equal(bell[0].type, 'document.expiring')
    assert.include(bell[0].title, 'vence en 6 días')

    await expectStatus(s.admin.api.post(`/documents/${contract.id}/archive`, {}), 200)
    await expectStatus(s.owner.api.get(`/resident/documents/${contract.id}`), 404)
    assert.lengthOf(await dataOf(s.admin.api.get('/documents', { status: 'archived' })), 1)
    await expectStatus(s.admin.api.post(`/documents/${contract.id}/restore`, {}), 200)
    await expectStatus(s.owner.api.get(`/resident/documents/${contract.id}`), 200)

    await expectStatus(
      client
        .delete(`/api/v1/documents/${contract.id}`)
        .loginAs(s.admin.user)
        .header('X-Tenant-Id', s.tenant.id) as unknown as Promise<any>,
      204
    )
    await expectStatus(s.admin.api.get(`/documents/${contract.id}`), 404)
  })
})
