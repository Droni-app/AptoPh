import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

const jsonObject = { tsType: 'Record<string, unknown>', decorators: [{ name: '@column' }] }

export default {
  tables: {
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
