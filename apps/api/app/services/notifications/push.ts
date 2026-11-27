import { createSign } from 'node:crypto'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import PushDevice from '#models/notifications/push_device'

/**
 * Push to the mobile app with Firebase Cloud Messaging HTTP v1
 * (docs/notifications.md). The service account signs a JWT that is exchanged
 * for an OAuth token (cached ~55 min). Without FCM_* variables it does nothing.
 */

export type PushMessage = {
  title: string
  body: string | null
  /** Data for the app: where to open, ids */
  data: Record<string, string>
}

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

let cached: { token: string; expiresAt: number } | null = null

function credentials() {
  const projectId = env.get('FCM_PROJECT_ID')
  const clientEmail = env.get('FCM_CLIENT_EMAIL')
  const privateKey = env.get('FCM_PRIVATE_KEY')?.replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey) return null
  return { projectId, clientEmail, privateKey }
}

export function pushEnabled() {
  return credentials() !== null
}

const base64url = (value: string | Buffer) => Buffer.from(value).toString('base64url')

async function accessToken(clientEmail: string, privateKey: string) {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({ iss: clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })
  )
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  const assertion = `${header}.${claims}.${base64url(signer.sign(privateKey))}`
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  if (!response.ok) throw new Error(`FCM auth failed with ${response.status}`)
  const json = (await response.json()) as { access_token: string; expires_in: number }
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
  return cached.token
}

/**
 * Sends `message` to every device of the users. Tokens FCM no longer knows
 * (app uninstalled) are deleted. Never throws: push is best effort.
 */
export async function sendPush(userIds: string[], message: PushMessage) {
  const creds = credentials()
  if (!creds || !userIds.length) return
  try {
    const devices = await PushDevice.query().whereIn('user_id', userIds)
    if (!devices.length) return
    const token = await accessToken(creds.clientEmail, creds.privateKey)
    const url = `https://fcm.googleapis.com/v1/projects/${creds.projectId}/messages:send`
    await Promise.all(
      devices.map(async (device) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'authorization': `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            message: {
              token: device.token,
              notification: { title: message.title, body: message.body ?? undefined },
              data: message.data,
              android: { priority: 'high' },
              apns: { payload: { aps: { sound: 'default' } } },
            },
          }),
        })
        if (response.status === 404 || response.status === 410) {
          await device.delete()
        } else if (!response.ok) {
          logger.warn({ status: response.status, deviceId: device.id }, 'FCM push failed')
        }
      })
    )
  } catch (err) {
    logger.error({ err }, 'could not send push notifications')
  }
}
