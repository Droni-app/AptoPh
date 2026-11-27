import { ref } from 'vue'
import { useToast } from '@aptoph/ui'
import { errorMessage, fieldErrors } from '@/lib/errors'

/**
 * State of a form that talks to the API: `saving`, field errors (422) and a
 * general error. `run` resolves to true on success.
 */
export function useSubmit() {
  const toast = useToast()
  const saving = ref(false)
  const errors = ref<Record<string, string>>({})
  const error = ref<string | null>(null)

  function reset() {
    errors.value = {}
    error.value = null
  }

  async function run(action: () => Promise<unknown>, success?: string) {
    saving.value = true
    reset()
    try {
      await action()
      if (success) toast.success(success)
      return true
    } catch (e) {
      errors.value = fieldErrors(e)
      error.value = Object.keys(errors.value).length ? null : errorMessage(e)
      return false
    } finally {
      saving.value = false
    }
  }

  return { saving, errors, error, run, reset }
}
