import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import drive from '@adonisjs/drive/services/main'
import Attachment from '#models/attachment'
import type Tenant from '#models/tenant'
import type User from '#models/user'
import { dataOf, financeSetup, memberApi } from './helpers.js'

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')

function upload(
  client: ApiClient,
  tenant: Tenant,
  user: User,
  path: string,
  file: { contents: Buffer; name: string }
) {
  return client
    .post(`/api/v1/finance/attachments/${path}`)
    .loginAs(user)
    .header('X-Tenant-Id', tenant.id)
    .file('file', file.contents, { filename: file.name }) as unknown as Promise<any>
}

/** A conjunto with a vendor and one bill */
async function billSetup(client: ApiClient) {
  const finance = await financeSetup(client, { fees: false })
  const accounts = (await dataOf(
    finance.api.get('/finance/accounts', { postable: true })
  )) as Array<{
    id: string
    code: string
  }>
  const accountId = accounts.find((row) => row.code === '514515')!.id
  const vendor = await finance.api.post('/finance/vendors', { name: 'Ascensores S.A.S.' })
  const bill = await finance.api.post('/finance/bills', {
    vendorId: vendor.body().data.id,
    issuedOn: '2026-02-01',
    dueOn: '2026-02-15',
    description: 'Mantenimiento de ascensores',
    lines: [{ accountId, amount: 500_000 }],
  })
  bill.assertStatus(201)
  return { ...finance, billId: bill.body().data.id as string }
}

test.group('Finance · attachments', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    drive.fake()
    return () => drive.restore()
  })

  test('uploads a file under the conjunto folder, lists it, signs a link and removes it', async ({
    client,
    assert,
  }) => {
    const { tenant, user, api, billId } = await billSetup(client)
    const disk = drive.use()

    const created = await upload(client, tenant, user, `bill/${billId}`, {
      contents: PDF,
      name: 'Factura EPM (nov).pdf',
    })
    created.assertStatus(201)
    const data = created.body().data
    assert.equal(data.fileName, 'Factura EPM (nov).pdf')
    assert.equal(data.ownerType, 'bill')
    assert.equal(data.sizeBytes, PDF.length)
    assert.equal(data.uploadedBy, user.fullName)

    const row = await Attachment.findOrFail(data.id)
    assert.match(
      row.fileKey,
      new RegExp(
        `^${tenant.slug}/finanzas/gastos/\\d{4}/\\d{2}/[0-9a-f-]{36}-factura-epm-nov\\.pdf$`
      )
    )
    assert.isTrue(await disk.exists(row.fileKey))

    const list = await api.get(`/finance/attachments/bill/${billId}`)
    list.assertStatus(200)
    assert.deepEqual(
      list.body().data.map((item: { id: string }) => item.id),
      [data.id]
    )

    const link = await api.get(`/finance/attachments/${data.id}/url`, { download: true })
    link.assertStatus(200)
    assert.isString(link.body().data.url)

    const removed = await client
      .delete(`/api/v1/finance/attachments/${data.id}`)
      .loginAs(user)
      .header('X-Tenant-Id', tenant.id)
    removed.assertStatus(204)
    assert.lengthOf(await dataOf(api.get(`/finance/attachments/bill/${billId}`)), 0)

    // Accounting support: the row and the file stay, only hidden
    await row.refresh()
    assert.isNotNull(row.deletedAt)
    assert.equal(row.deletedById, user.id)
    assert.isTrue(await disk.exists(row.fileKey))
    const gone = await api.get(`/finance/attachments/${data.id}/url`)
    gone.assertStatus(404)
  })

  test('rejects files that are not allowed and records of other conjuntos', async ({ client }) => {
    const { tenant, user, billId } = await billSetup(client)
    const other = await billSetup(client)

    const exe = await upload(client, tenant, user, `bill/${billId}`, {
      contents: Buffer.from('MZ'),
      name: 'virus.exe',
    })
    exe.assertStatus(422)

    const missing = await upload(client, tenant, user, `bill/${randomUUID()}`, {
      contents: PDF,
      name: 'factura.pdf',
    })
    missing.assertStatus(404)

    const foreign = await upload(client, tenant, user, `bill/${other.billId}`, {
      contents: PDF,
      name: 'factura.pdf',
    })
    foreign.assertStatus(404)

    // Same record id, wrong kind of owner
    const wrongType = await upload(client, tenant, user, `payment/${billId}`, {
      contents: PDF,
      name: 'factura.pdf',
    })
    wrongType.assertStatus(404)

    const unknownType = await upload(client, tenant, user, `ticket/${billId}`, {
      contents: PDF,
      name: 'factura.pdf',
    })
    unknownType.assertStatus(404)

    // Another conjunto cannot open this conjunto's files
    const created = await upload(client, tenant, user, `bill/${billId}`, {
      contents: PDF,
      name: 'factura.pdf',
    })
    created.assertStatus(201)
    const link = await other.api.get(`/finance/attachments/${created.body().data.id}/url`)
    link.assertStatus(404)
  })

  test('read-only roles can open attachments but not upload them', async ({ client }) => {
    const { tenant, user, billId } = await billSetup(client)
    const created = await upload(client, tenant, user, `bill/${billId}`, {
      contents: PDF,
      name: 'factura.pdf',
    })
    created.assertStatus(201)

    const council = await memberApi(client, tenant, 'council_member')
    const list = await council.api.get(`/finance/attachments/bill/${billId}`)
    list.assertStatus(200)
    const link = await council.api.get(`/finance/attachments/${created.body().data.id}/url`)
    link.assertStatus(200)

    const denied = await upload(client, tenant, council.user, `bill/${billId}`, {
      contents: PDF,
      name: 'otra.pdf',
    })
    denied.assertStatus(403)
  })
})
