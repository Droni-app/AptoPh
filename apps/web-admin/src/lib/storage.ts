/**
 * Storage access can throw (private mode, blocked site data): never let it break the app.
 */
export function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeJson(storage: Storage, key: string, value: unknown) {
  try {
    if (value === null || value === undefined) storage.removeItem(key)
    else storage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}
