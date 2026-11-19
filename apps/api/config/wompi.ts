import env from '#start/env'

/**
 * Wompi payment gateway (docs/billing.md). Not configured = payments disabled:
 * the billing endpoints answer 503 and nothing is charged.
 *
 * The keys must belong to the configured environment; a production key in
 * sandbox (or the other way around) stops the application at boot.
 */
const environment = env.get('WOMPI_ENV', 'sandbox')
const publicKey = env.get('WOMPI_PUBLIC_KEY')
const privateKey = env.get('WOMPI_PRIVATE_KEY')?.release()
const eventsSecret = env.get('WOMPI_EVENTS_SECRET')?.release()
const integritySecret = env.get('WOMPI_INTEGRITY_SECRET')?.release()

const configured = Boolean(publicKey && privateKey && eventsSecret && integritySecret)
if (configured) {
  const tag = environment === 'production' ? 'prod' : 'test'
  const expected: Array<[string, string]> = [
    ['WOMPI_PUBLIC_KEY', `pub_${tag}_`],
    ['WOMPI_PRIVATE_KEY', `prv_${tag}_`],
    ['WOMPI_EVENTS_SECRET', `${tag}_events_`],
    ['WOMPI_INTEGRITY_SECRET', `${tag}_integrity_`],
  ]
  const values: Record<string, string> = {
    WOMPI_PUBLIC_KEY: publicKey!,
    WOMPI_PRIVATE_KEY: privateKey!,
    WOMPI_EVENTS_SECRET: eventsSecret!,
    WOMPI_INTEGRITY_SECRET: integritySecret!,
  }
  for (const [name, prefix] of expected) {
    if (!values[name]!.startsWith(prefix)) {
      throw new Error(`${name} does not belong to WOMPI_ENV=${environment} (expected ${prefix}…)`)
    }
  }
} else if (publicKey || privateKey || eventsSecret || integritySecret) {
  throw new Error(
    'Wompi needs WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY, WOMPI_EVENTS_SECRET and WOMPI_INTEGRITY_SECRET'
  )
}

const wompiConfig = {
  configured,
  environment,
  /** Value of `environment` in Wompi's events */
  eventEnvironment: environment === 'production' ? 'prod' : 'test',
  apiUrl:
    environment === 'production' ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1',
  checkoutUrl: 'https://checkout.wompi.co/p/',
  publicKey: publicKey ?? '',
  privateKey: privateKey ?? '',
  eventsSecret: eventsSecret ?? '',
  integritySecret: integritySecret ?? '',
}

export default wompiConfig
