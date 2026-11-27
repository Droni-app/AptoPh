import type { ComputedRef, InjectionKey } from 'vue'

/** What a <UiLabel> tells the control inside it (id, error state, help text) */
export interface FieldContext {
  id: string
  /** The first control inside the label takes its id (so the label points to it) */
  takeId(): string | undefined
  invalid: ComputedRef<boolean>
  describedBy: ComputedRef<string | undefined>
}

export const FIELD_KEY: InjectionKey<FieldContext> = Symbol('ui-field')
