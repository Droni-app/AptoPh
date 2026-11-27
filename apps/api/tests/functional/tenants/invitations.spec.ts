import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import Building from '#models/property/building'
import Enrollment from '#models/tenants/enrollment'
import Unit from '#models/property/unit'
import UnitOccupant from '#models/property/unit_occupant'
import User from '#models/auth/user'
import InvitationMail from '#mails/tenants/invitation_mail'
import InvitationService from '#services/tenants/invitation_service'
import LegalAcceptance from '#models/legal/legal_acceptance'
import { LEGAL_DOCUMENTS } from '@aptoph/shared'
import { createMember, resetRateLimits, tokenFrom } from '#tests/helpers'

const invitee = { email: 'nora@example.com', fullName: 'Nora Nueva' }

test.group('Members · invite', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => mail.restore())

  test('the administration invites a new person; the account has no password yet', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()
    const { tenant, user: admin } = await createMember('administrator')

    const response = await client
      .post('/api/v1/members')
      .json({ ...invitee, email: 'Nora@Example.com', role: 'council_member', title: 'Presidenta' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)

    response.assertStatus(201)
    response.assertBodyContains({
      data: {
        role: 'council_member',
        status: 'invited',
        title: 'Presidenta',
        invitationExpired: false,
        invitedBy: { id: admin.id },
        user: { email: 'nora@example.com', fullName: 'Nora Nueva' },
      },
    })

    const user = await User.findByOrFail('email', 'nora@example.com')
    assert.isFalse(user.hasPassword)

    mails.assertQueued(InvitationMail, (message) => {
      // Staff roles accept in the back-office
      assert.match(message.acceptUrl, /^http:\/\/localhost:5174\/invitacion\?token=/)
      return true
    })
  })

  test('residents accept in the residents portal', async ({ client, assert }) => {
    const { mails } = mail.fake()
    const { tenant, user: admin } = await createMember('administrator')

    await client
      .post('/api/v1/members')
      .json({ ...invitee, role: 'resident' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)

    mails.assertQueued(InvitationMail, (message) => {
      assert.match(message.acceptUrl, /^http:\/\/localhost:5173\/invitacion\?token=/)
      return true
    })
  })

  test('adds a new role to a person who already has an account', async ({ client, assert }) => {
    mail.fake()
    const { tenant, user: admin } = await createMember('administrator')
    const { user: resident } = await createMember('resident', tenant)

    const response = await client
      .post('/api/v1/members')
      .json({ email: resident.email, fullName: 'Otro Nombre', role: 'council_member' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)

    response.assertStatus(201)
    await resident.refresh()
    // The account keeps its name and password
    assert.notEqual(resident.fullName, 'Otro Nombre')
    assert.isTrue(resident.hasPassword)
  })

  test('rejects a role the person already has or is invited to', async ({ client }) => {
    mail.fake()
    const { tenant, user: admin } = await createMember('administrator')
    const { user: staff } = await createMember('staff', tenant)

    const active = await client
      .post('/api/v1/members')
      .json({ email: staff.email, fullName: staff.fullName, role: 'staff' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)
    active.assertStatus(422)
    active.assertBodyContains({ errors: [{ field: 'email' }] })

    await client
      .post('/api/v1/members')
      .json({ ...invitee, role: 'accountant' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)
    const pending = await client
      .post('/api/v1/members')
      .json({ ...invitee, role: 'accountant' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)
    pending.assertStatus(422)
  })

  test('only the administration can invite', async ({ client }) => {
    const { tenant } = await createMember('administrator')
    const { user: council } = await createMember('council_member', tenant)

    const response = await client
      .post('/api/v1/members')
      .json({ ...invitee, role: 'staff' })
      .loginAs(council)
      .header('X-Tenant-Id', tenant.id)
    response.assertStatus(403)
  })

  test('links a resident invitation to an occupant of a unit', async ({ client, assert }) => {
    mail.fake()
    const { tenant, user: admin } = await createMember('administrator')
    const building = await Building.create({ tenantId: tenant.id, name: 'Torre 1', sortOrder: 1 })
    const unit = await Unit.create({
      tenantId: tenant.id,
      buildingId: building.id,
      code: '101',
      type: 'apartment',
      ownershipCoefficient: '0.010000',
      status: 'occupied',
    })
    const occupant = await UnitOccupant.create({
      tenantId: tenant.id,
      unitId: unit.id,
      fullName: 'Nora Nueva',
      relationship: 'owner',
    })

    const response = await client
      .post('/api/v1/members')
      .json({ ...invitee, role: 'resident', occupantId: occupant.id })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)

    response.assertStatus(201)
    await occupant.refresh()
    const user = await User.findByOrFail('email', invitee.email)
    assert.equal(occupant.userId, user.id)
    assert.equal(occupant.email, invitee.email)
  })

  test('an occupant from another conjunto cannot be linked', async ({ client }) => {
    mail.fake()
    const { tenant, user: admin } = await createMember('administrator')
    const { tenant: other } = await createMember('administrator')
    const unit = await Unit.create({
      tenantId: other.id,
      code: '101',
      type: 'apartment',
      ownershipCoefficient: '0.010000',
      status: 'occupied',
    })
    const occupant = await UnitOccupant.create({
      tenantId: other.id,
      unitId: unit.id,
      fullName: 'Ajena',
      relationship: 'owner',
    })

    const response = await client
      .post('/api/v1/members')
      .json({ ...invitee, role: 'resident', occupantId: occupant.id })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)
    response.assertStatus(422)
    response.assertBodyContains({ errors: [{ field: 'occupantId' }] })
  })

  test('resends a pending invitation with a new link', async ({ client, assert }) => {
    const { mails } = mail.fake()
    const { tenant, user: admin } = await createMember('administrator')
    const { enrollment, token } = await new InvitationService().invite(tenant, admin, {
      ...invitee,
      role: 'staff',
    })

    const response = await client
      .post(`/api/v1/members/${enrollment.id}/invitation`)
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)

    response.assertStatus(200)
    mails.assertQueued(InvitationMail, (message) => {
      assert.notEqual(tokenFrom(message.acceptUrl), token)
      return true
    })
    const old = await client.get(`/api/v1/invitations/${token}`)
    old.assertStatus(404)
  })
})

test.group('Invitations · accept', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => resetRateLimits())

  test('shows the invitation before accepting it', async ({ client }) => {
    const { tenant, user: admin } = await createMember('administrator')
    const { token } = await new InvitationService().invite(tenant, admin, {
      ...invitee,
      role: 'accountant',
    })

    const response = await client.get(`/api/v1/invitations/${token}`)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        tenant: { id: tenant.id, name: tenant.name },
        role: 'accountant',
        roleLabel: 'Contabilidad',
        email: invitee.email,
        invitedBy: admin.fullName,
        needsPassword: true,
      },
    })
  })

  test('a new person creates a password, gets access and is signed in', async ({
    client,
    assert,
  }) => {
    const { tenant, user: admin } = await createMember('administrator')
    const { token, enrollment } = await new InvitationService().invite(tenant, admin, {
      ...invitee,
      role: 'staff',
    })

    const missing = await client
      .post('/api/v1/invitations/accept')
      .json({ token, acceptTerms: true })
    missing.assertStatus(422)
    missing.assertBodyContains({ errors: [{ field: 'password' }] })

    // The terms and the data policy must be accepted
    const notAccepted = await client
      .post('/api/v1/invitations/accept')
      .json({ token, password: 'nora-password-1' } as never)
    notAccepted.assertStatus(422)
    notAccepted.assertBodyContains({ errors: [{ field: 'acceptTerms' }] })

    const response = await client
      .post('/api/v1/invitations/accept')
      .json({ token, acceptTerms: true, password: 'nora-password-1', fullName: 'Nora N. Nueva' })

    response.assertStatus(200)
    response.assertBodyContains({ data: { tenantId: tenant.id, role: 'staff' } })

    await enrollment.refresh()
    assert.equal(enrollment.status, 'active')
    assert.isNotNull(enrollment.acceptedAt)
    assert.isNull(enrollment.invitationTokenHash)

    const user = await User.findByOrFail('email', invitee.email)
    assert.equal(user.fullName, 'Nora N. Nueva')
    assert.isNotNull(user.emailVerifiedAt)

    // Evidence of the acceptance, for this conjunto and the current versions
    const acceptances = await LegalAcceptance.query().where('userId', user.id).orderBy('document')
    assert.deepEqual(
      acceptances.map((a) => [a.document, a.version, a.context, a.tenantId]),
      [
        ['privacy', LEGAL_DOCUMENTS.privacy.version, 'invitation', tenant.id],
        ['terms', LEGAL_DOCUMENTS.terms.version, 'invitation', tenant.id],
      ]
    )
    assert.isNotNull(acceptances[0]!.ipAddress)

    const tenants = await client
      .get('/api/v1/account/tenants')
      .header('Authorization', `Bearer ${response.body().data.token}`)
    tenants.assertBodyContains({ data: [{ id: tenant.id, roles: ['staff'] }] })

    const login = await client
      .post('/api/v1/auth/login')
      .json({ email: invitee.email, password: 'nora-password-1' })
    login.assertStatus(200)
  })

  test('a person with an account accepts without changing the password', async ({
    client,
    assert,
  }) => {
    const { tenant, user: admin } = await createMember('administrator')
    const { user: resident } = await createMember('resident', tenant)
    const { token } = await new InvitationService().invite(tenant, admin, {
      email: resident.email,
      fullName: resident.fullName,
      role: 'council_member',
    })

    const preview = await client.get(`/api/v1/invitations/${token}`)
    preview.assertBodyContains({ data: { needsPassword: false } })

    const response = await client
      .post('/api/v1/invitations/accept')
      .json({ token, acceptTerms: true })
    response.assertStatus(200)
    await resident.refresh()
    assert.isTrue(await resident.verifyPassword('secret-password'))
  })

  test('a link works only once', async ({ client }) => {
    const { tenant, user: admin } = await createMember('administrator')
    const { token } = await new InvitationService().invite(tenant, admin, {
      ...invitee,
      role: 'staff',
    })

    await client
      .post('/api/v1/invitations/accept')
      .json({ token, acceptTerms: true, password: 'nora-password-1' })
    const again = await client
      .post('/api/v1/invitations/accept')
      .json({ token, acceptTerms: true, password: 'nora-password-1' })
    again.assertStatus(404)
  })

  test('an expired invitation cannot be accepted', async ({ client }) => {
    const { tenant, user: admin } = await createMember('administrator')
    const { token, enrollment } = await new InvitationService().invite(tenant, admin, {
      ...invitee,
      role: 'staff',
    })
    enrollment.invitationExpiresAt = DateTime.now().minus({ minutes: 1 })
    await enrollment.save()

    const preview = await client.get(`/api/v1/invitations/${token}`)
    preview.assertStatus(404)
    const accept = await client
      .post('/api/v1/invitations/accept')
      .json({ token, acceptTerms: true, password: 'nora-password-1' })
    accept.assertStatus(404)
  })

  test('a cancelled invitation cannot be accepted', async ({ client, assert }) => {
    const { tenant, user: admin } = await createMember('administrator')
    const { token, enrollment } = await new InvitationService().invite(tenant, admin, {
      ...invitee,
      role: 'staff',
    })

    await client
      .patch(`/api/v1/members/${enrollment.id}/status`)
      .json({ status: 'revoked' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)

    const accept = await client
      .post('/api/v1/invitations/accept')
      .json({ token, acceptTerms: true, password: 'nora-password-1' })
    accept.assertStatus(404)
    await enrollment.refresh()
    assert.equal(enrollment.status, 'revoked')
  })

  test('a revoked role can be invited again', async ({ client }) => {
    mail.fake()
    const { tenant, user: admin } = await createMember('administrator')
    const { user: staff } = await createMember('staff', tenant)
    await Enrollment.query().where({ userId: staff.id }).update({ status: 'revoked' })

    const response = await client
      .post('/api/v1/members')
      .json({ email: staff.email, fullName: staff.fullName, role: 'staff' })
      .loginAs(admin)
      .header('X-Tenant-Id', tenant.id)
    response.assertStatus(201)
    response.assertBodyContains({ data: { status: 'invited' } })
    mail.restore()
  })
})
