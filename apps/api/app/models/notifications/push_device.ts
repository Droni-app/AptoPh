import { PushDeviceSchema } from '#database/schema'
import type { PushPlatform } from '@aptoph/shared'

/** A phone with the mobile app signed in: its Firebase Cloud Messaging token */
export default class PushDevice extends PushDeviceSchema {
  declare platform: PushPlatform
}
