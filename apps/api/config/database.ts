import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'pg',

  connections: {
    pg: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
        // Managed PostgreSQL requires TLS; verify it against the provider's CA
        ssl: env.get('DB_CA_CERT') ? { ca: env.get('DB_CA_CERT') } : undefined,
      },
      /**
       * One folder per module, in dependency order: a module can only
       * reference tables of the modules above it. A new module is added here.
       */
      migrations: {
        naturalSort: true,
        paths: [
          'database/migrations/auth',
          'database/migrations/tenants',
          'database/migrations/property',
          'database/migrations/finance',
          'database/migrations/files',
          'database/migrations/documents',
          'database/migrations/amenities',
          'database/migrations/announcements',
          'database/migrations/tickets',
          'database/migrations/gatehouse',
          'database/migrations/billing',
        ],
      },
      schemaGeneration: {
        enabled: true,
        rulesPaths: ['./database/schema_rules.js'],
      },
      debug: app.inDev,
    },
  },
})

export default dbConfig
