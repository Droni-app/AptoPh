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

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // CORS: comma-separated origins allowed outside development (the web apps)
  CORS_ORIGINS: Env.schema.string.optional(),

  // Production OAuth clients (database/seeders/production_seeder.ts)
  WEB_URL: Env.schema.string.optional({ format: 'url', tld: false }),
  BACKOFFICE_URL: Env.schema.string.optional({ format: 'url', tld: false }),

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
})
