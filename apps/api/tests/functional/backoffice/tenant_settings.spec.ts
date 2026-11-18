import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { createMember } from '#tests/helpers'

const settings = {
  name: 'Conjunto Los Álamos',
  legalName: 'Conjunto Residencial Los Álamos P.H.',
  taxId: '900.123.456-7',
  propertyType: 'mixed',
  address: 'Calle 10 # 20-30',
  city: 'Cali',
}

test.group('Back-office · conjunto settings', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the administration updates the conjunto data', async ({ client }) => {
    const { tenant, user } = await createMember('administrator')

    const response = await client
      .patch('/api/v1/settings/tenant')
      .json(settings)
      .loginAs(user)
      .header('X-Tenant-Id', tenant.id)

    response.assertStatus(200)
    response.assertBodyContains({ data: settings })
  })

  test('other back-office roles can read but not change it', async ({ client }) => {
    const { tenant } = await createMember('administrator')
    const { user: accountant } = await createMember('accountant', tenant)

    const read = await client
      .get('/api/v1/settings/tenant')
      .loginAs(accountant)
      .header('X-Tenant-Id', tenant.id)
    read.assertStatus(200)

    const write = await client
      .patch('/api/v1/settings/tenant')
      .json(settings)
      .loginAs(accountant)
      .header('X-Tenant-Id', tenant.id)
    write.assertStatus(403)
  })

  test('residents have no access', async ({ client }) => {
    const { tenant } = await createMember('administrator')
    const { user: resident } = await createMember('resident', tenant)

    const response = await client
      .get('/api/v1/settings/tenant')
      .loginAs(resident)
      .header('X-Tenant-Id', tenant.id)
    response.assertStatus(403)
  })

  test('validates the NIT', async ({ client }) => {
    const { tenant, user } = await createMember('administrator')
    const response = await client
      .patch('/api/v1/settings/tenant')
      .json({ ...settings, taxId: 'abc' })
      .loginAs(user)
      .header('X-Tenant-Id', tenant.id)
    response.assertStatus(422)
  })
})
