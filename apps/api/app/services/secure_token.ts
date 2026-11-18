import { createHash, randomBytes } from 'node:crypto'

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
