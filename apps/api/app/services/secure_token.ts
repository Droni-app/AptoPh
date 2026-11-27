import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import env from '#start/env'

/**
 * Random tokens for links sent by email. Only the SHA-256 hash is stored, so a
 * database leak does not expose working links.
 */
export function hashToken(plain: string) {
  return createHash('sha256').update(plain).digest('hex')
}

export function generateToken() {
  const plain = randomBytes(32).toString('base64url')
  return { plain, hash: hashToken(plain) }
}

/**
 * HMAC of a value with the APP_KEY, for links that must keep working without
 * a session (e.g. the image of a comunicado inside an email).
 */
export function signValue(purpose: string, value: string) {
  return createHmac('sha256', env.get('APP_KEY').release())
    .update(`${purpose}:${value}`)
    .digest('base64url')
}

export function verifySignature(purpose: string, value: string, signature: string) {
  const expected = Buffer.from(signValue(purpose, value))
  const given = Buffer.from(signature)
  return expected.length === given.length && timingSafeEqual(expected, given)
}
