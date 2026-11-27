import type { InjectionKey } from 'vue'

export const DROPDOWN_KEY: InjectionKey<{ close(): void }> = Symbol('ui-dropdown')
