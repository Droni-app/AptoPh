/**
 * PKCE helpers (RFC 7636, S256) using the Web Crypto API
 */
function base64url(bytes: ArrayBuffer | Uint8Array) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (const byte of array) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Cryptographically random URL-safe string (32 bytes → 43 chars) */
export function randomString(bytes = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)))
}

export async function codeChallengeFor(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(digest)
}
