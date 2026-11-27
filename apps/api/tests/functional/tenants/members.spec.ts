import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Enrollment from '#models/tenants/enrollment'
import User from '#models/auth/user'
import { createMember } from '#tests/helpers'

async function enrollmentOf(user: User) {
  return Enrollment.query().where('user_id', user.id).firstOrFail()
}

test.group('Members · manage', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('updates the title and validity dates', async ({ client }) => {
    const { tenant, user: admin } = await createMember('administrator')
    const { user: council } = await createMember('council_member', tenant)
    const enrollment = await enrollmentOf(council)

    const response = await client
      .patch(`/api/v1/members/${enrollment.id}`)
      .json({ title: 'Presidente', startsOn: '2026-01-01', endsOn: '2026-12-31' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)

    response.assertStatus(200)
    response.assertBodyContains({
      data: { title: 'Presidente', startsOn: '2026-01-01', endsOn: '2026-12-31' },
    })
  })

  test('suspends and reactivates a person; while suspended there is no access', async ({
    client,
  }) => {
    const { tenant, user: admin } = await createMember('administrator')
    const { user: staff } = await createMember('staff', tenant)
    const enrollment = await enrollmentOf(staff)

    const suspend = await client
      .patch(`/api/v1/members/${enrollment.id}/status`)
      .json({ status: 'suspended' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)
    suspend.assertStatus(200)
    suspend.assertBodyContains({ data: { status: 'suspended' } })

    const denied = await client
      .get('/api/v1/dashboard')
      .loginAs(staff)
      .header('X-Tenant-Id', tenant.id)
    denied.assertStatus(403)

    const reactivate = await client
      .patch(`/api/v1/members/${enrollment.id}/status`)
      .json({ status: 'active' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)
    reactivate.assertBodyContains({ data: { status: 'active' } })
  })

  test('revoking the last access closes the person’s sessions', async ({ client, assert }) => {
    const { tenant, user: admin } = await createMember('administrator')
    const { user: staff } = await createMember('staff', tenant)
    await User.accessTokens.create(staff)
    const enrollment = await enrollmentOf(staff)

    await client
      .patch(`/api/v1/members/${enrollment.id}/status`)
      .json({ status: 'revoked' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)

    assert.lengthOf(await User.accessTokens.all(staff), 0)
  })

  test('keeps the sessions when the person still has access somewhere', async ({
    client,
    assert,
  }) => {
    const { tenant, user: admin } = await createMember('administrator')
    const { user: staff } = await createMember('staff', tenant)
    await Enrollment.create({
      tenantId: tenant.id,
      userId: staff.id,
      role: 'resident',
      status: 'active',
    })
    await User.accessTokens.create(staff)
    const enrollment = await Enrollment.query()
      .where({ userId: staff.id, role: 'staff' })
      .firstOrFail()

    await client
      .patch(`/api/v1/members/${enrollment.id}/status`)
      .json({ status: 'revoked' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)

    assert.lengthOf(await User.accessTokens.all(staff), 1)
  })

  test('an administrator can retire another administrator', async ({ client }) => {
    const { tenant, user: admin } = await createMember('administrator')
    const { user: other } = await createMember('administrator', tenant)
    const enrollment = await enrollmentOf(other)

    const response = await client
      .patch(`/api/v1/members/${enrollment.id}/status`)
      .json({ status: 'revoked' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)
    response.assertStatus(200)
    response.assertBodyContains({ data: { status: 'revoked' } })
  })

  test('nobody changes their own access', async ({ client }) => {
    const { tenant, user: admin } = await createMember('administrator')
    await createMember('administrator', tenant)
    const enrollment = await enrollmentOf(admin)

    const response = await client
      .patch(`/api/v1/members/${enrollment.id}/status`)
      .json({ status: 'suspended' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)
    response.assertStatus(403)
  })

  test('a pending invitation cannot be activated by hand', async ({ client }) => {
    const { tenant, user: admin } = await createMember('administrator')
    const { user: staff } = await createMember('staff', tenant)
    const enrollment = await enrollmentOf(staff)
    enrollment.status = 'invited'
    await enrollment.save()

    const response = await client
      .patch(`/api/v1/members/${enrollment.id}/status`)
      .json({ status: 'active' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)
    response.assertStatus(409)
  })

  test('hides revoked people unless asked and searches by name or email', async ({
    client,
    assert,
  }) => {
    const { tenant, user: admin } = await createMember('administrator')
    const { user: revoked } = await createMember('staff', tenant)
    await Enrollment.query().where({ userId: revoked.id }).update({ status: 'revoked' })

    const list = await client.get('/api/v1/members').loginAs(admin).header('X-Tenant-Id', tenant.id)
    const ids = (list.body().data as Array<{ user: { id: string } }>).map((m) => m.user.id)
    assert.notInclude(ids, revoked.id)

    const search = await client
      .get('/api/v1/members')
      .qs({ search: revoked.email.slice(0, 10), status: 'revoked' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)
    assert.lengthOf(search.body().data as unknown[], 1)
  })

  test('members of another conjunto cannot be managed', async ({ client }) => {
    const { tenant, user: admin } = await createMember('administrator')
    const { user: outsider } = await createMember('staff')
    const enrollment = await enrollmentOf(outsider)

    const response = await client
      .patch(`/api/v1/members/${enrollment.id}/status`)
      .json({ status: 'suspended' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)
    response.assertStatus(404)
  })
})
