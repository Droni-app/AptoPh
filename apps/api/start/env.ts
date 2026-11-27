/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // CORS: comma-separated origins allowed outside development (the web apps)
  CORS_ORIGINS: Env.schema.string.optional(),

  // Public URLs of the web apps, for links sent by email (invitations, password reset…)
  // Defaults: http://localhost:5174 (back-office) and http://localhost:5173 (residents)
  BACKOFFICE_URL: Env.schema.string.optional({ format: 'url', tld: false }),
  RESIDENTS_URL: Env.schema.string.optional({ format: 'url', tld: false }),

  // Database (PostgreSQL)
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),
  /** CA certificate of a managed database (DigitalOcean); enables TLS when set */
  DB_CA_CERT: Env.schema.string.optional(),

  // Mail (SMTP · Mailjet)
  MAIL_MAILER: Env.schema.enum(['smtp'] as const),
  MAIL_FROM_NAME: Env.schema.string(),
  MAIL_FROM_ADDRESS: Env.schema.string({ format: 'email' }),
  SMTP_HOST: Env.schema.string({ format: 'host' }),
  SMTP_PORT: Env.schema.number(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),
  SMTP_REQUIRE_TLS: Env.schema.boolean.optional(),

  // Sales inbox notified when a conjunto asks to activate a paid plan (optional)
  SALES_EMAIL: Env.schema.string.optional({ format: 'email' }),

  /*
  |----------------------------------------------------------
  | Variables for configuring the limiter package
  |----------------------------------------------------------
  */
  LIMITER_STORE: Env.schema.enum(['database', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Push notifications to the mobile app (Firebase Cloud Messaging HTTP v1),
  | with a service account. Without them push is off and the bell and the
  | emails still work. docs/notifications.md
  |----------------------------------------------------------
  */
  FCM_PROJECT_ID: Env.schema.string.optional(),
  FCM_CLIENT_EMAIL: Env.schema.string.optional(),
  /** PEM; `\n` escaped is accepted */
  FCM_PRIVATE_KEY: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | File storage (drive): `fs` keeps files in ./storage (development and
  | tests), `spaces` uses the DigitalOcean Spaces bucket. docs/files.md
  |----------------------------------------------------------
  */
  DRIVE_DISK: Env.schema.enum.optional(['fs', 'spaces'] as const),
  SPACES_KEY: Env.schema.string.optional(),
  SPACES_SECRET: Env.schema.string.optional(),
  SPACES_REGION: Env.schema.string.optional(),
  SPACES_BUCKET: Env.schema.string.optional(),
  SPACES_ENDPOINT: Env.schema.string.optional({ format: 'url', tld: false }),

  /*
  |----------------------------------------------------------
  | Wompi (payments of the conjuntos to AptoPH). Each environment uses its
  | own keys: `pub_test_…` in sandbox, `pub_prod_…` in production.
  | docs/billing.md
  |----------------------------------------------------------
  */
  WOMPI_ENV: Env.schema.enum.optional(['sandbox', 'production'] as const),
  WOMPI_PUBLIC_KEY: Env.schema.string.optional(),
  WOMPI_PRIVATE_KEY: Env.schema.secret.optional(),
  WOMPI_EVENTS_SECRET: Env.schema.secret.optional(),
  WOMPI_INTEGRITY_SECRET: Env.schema.secret.optional(),
})
