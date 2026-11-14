import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

const textArray = { tsType: 'string[]', decorators: [{ name: '@column' }] }
const jsonObject = { tsType: 'Record<string, unknown>', decorators: [{ name: '@column' }] }

export default {
  tables: {
    oauth_clients: {
      columns: {
        redirect_uris: textArray,
        post_logout_redirect_uris: textArray,
      },
    },
    tenants: {
      columns: {
        settings: jsonObject,
      },
    },
    amenities: {
      columns: {
        rules: jsonObject,
      },
    },
    audit_logs: {
      columns: {
        changes: { ...jsonObject, tsType: 'Record<string, unknown> | null' },
      },
    },
  },
} satisfies SchemaRules
