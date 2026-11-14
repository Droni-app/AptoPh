import { ApiError } from '@/lib/http'

export function errorMessage(error: unknown, fallback = 'Ocurrió un error inesperado') {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'No tienes permisos para realizar esta acción'
    if (error.status === 404) return 'El registro no existe'
    return error.message
  }
  if (error instanceof TypeError) return 'No se pudo conectar con el servidor'
  return fallback
}

export function fieldErrors(error: unknown): Record<string, string> {
  return error instanceof ApiError && error.status === 422 ? error.fieldErrors : {}
}
