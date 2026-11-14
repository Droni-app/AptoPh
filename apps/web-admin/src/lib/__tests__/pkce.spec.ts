import { describe, expect, it } from 'vitest'
import { codeChallengeFor, randomString } from '../pkce'

describe('pkce', () => {
  it('generates URL-safe verifiers of 43 chars', () => {
    const verifier = randomString()
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]{43}$/)
    expect(randomString()).not.toBe(verifier)
  })

  it('computes the S256 challenge (RFC 7636 appendix B)', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    expect(await codeChallengeFor(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})
