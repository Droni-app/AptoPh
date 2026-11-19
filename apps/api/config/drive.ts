import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, services } from '@adonisjs/drive'

/**
 * File storage. Everything is private: files are opened through signed URLs
 * that expire (docs/files.md).
 *
 *  - `fs`: ./storage, served by the API under /uploads with a signature.
 *    Default in development and tests.
 *  - `spaces`: the DigitalOcean Spaces bucket (production).
 */
const spacesConfigured = Boolean(
  env.get('SPACES_KEY') && env.get('SPACES_SECRET') && env.get('SPACES_BUCKET')
)
if (env.get('DRIVE_DISK') === 'spaces' && !spacesConfigured) {
  throw new Error('DRIVE_DISK=spaces needs SPACES_KEY, SPACES_SECRET and SPACES_BUCKET')
}

const driveConfig = defineConfig({
  default: env.get('DRIVE_DISK', 'fs'),

  services: {
    fs: services.fs({
      location: app.makePath('storage'),
      serveFiles: true,
      routeBasePath: '/uploads',
      appUrl: env.get('APP_URL'),
      visibility: 'private',
    }),
    ...(spacesConfigured
      ? {
          spaces: services.s3({
            credentials: {
              accessKeyId: env.get('SPACES_KEY')!,
              secretAccessKey: env.get('SPACES_SECRET')!,
            },
            region: env.get('SPACES_REGION', 'nyc3'),
            bucket: env.get('SPACES_BUCKET')!,
            endpoint: env.get(
              'SPACES_ENDPOINT',
              `https://${env.get('SPACES_REGION', 'nyc3')}.digitaloceanspaces.com`
            ),
            visibility: 'private',
            // The bucket is private: objects inherit it, no per-object ACL
            supportsACL: false,
            // Spaces rejects the CRC checksums newer AWS SDKs send by default
            requestChecksumCalculation: 'WHEN_REQUIRED',
            responseChecksumValidation: 'WHEN_REQUIRED',
          }),
        }
      : {}),
  },
})

export default driveConfig

declare module '@adonisjs/drive/types' {
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}
