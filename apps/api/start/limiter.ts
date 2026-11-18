/*
|--------------------------------------------------------------------------
| Rate limits
|--------------------------------------------------------------------------
|
| Login, password reset and invitation links are public endpoints: limits
| slow down password guessing and email flooding. Store: LIMITER_STORE
| (database in production, memory in tests).
|
*/

import limiter from '@adonisjs/limiter/services/main'
import { errors, type Limiter } from '@adonisjs/limiter'

type ThrottleException = InstanceType<typeof errors.E_TOO_MANY_REQUESTS>

/** Spanish message with the time to wait */
export function tooManyAttempts(error: ThrottleException) {
  const minutes = Math.max(1, Math.ceil(error.response.availableIn / 60))
  return error.setMessage(
    `Demasiados intentos. Vuelve a intentarlo en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`
  )
}

/** For `limiter.attempt`, which returns undefined instead of the exception */
export async function throwTooManyAttempts(store: Limiter, key: string): Promise<never> {
  const response = await store.get(key)
  throw tooManyAttempts(new errors.E_TOO_MANY_REQUESTS(response!))
}

/**
 * Failed logins per email and IP: 5 mistakes block that pair for 15 minutes.
 * Only failures count (see AuthController.login).
 */
export const loginLimiter = limiter.use({
  requests: 5,
  duration: '15 mins',
  blockDuration: '15 mins',
})

/**
 * "Forgot my password" per email: 3 emails every 15 minutes
 */
export const passwordResetEmailLimiter = limiter.use({ requests: 3, duration: '15 mins' })

/**
 * Verification emails per user: 3 per hour
 */
export const verificationEmailLimiter = limiter.use({ requests: 3, duration: '1 hour' })

/**
 * Sign-ups per IP: 5 per hour
 */
export const throttleSignup = limiter.define('signup', (ctx) => {
  return limiter
    .allowRequests(5)
    .every('1 hour')
    .usingKey(`signup_${ctx.request.ip()}`)
    .limitExceeded(tooManyAttempts)
})

/**
 * Public endpoints that receive a token or an email (password reset, invitations,
 * email verification): 20 requests per IP every 15 minutes
 */
export const throttlePublic = limiter.define('public', (ctx) => {
  return limiter
    .allowRequests(20)
    .every('15 mins')
    .usingKey(`public_${ctx.request.ip()}`)
    .limitExceeded(tooManyAttempts)
})
