import type { DocumentFolder, DocumentItem, DocumentStatus } from '@aptoph/shared'

export const STATUS_COLORS: Record<DocumentStatus, 'neutral' | 'success' | 'warning'> = {
  draft: 'warning',
  published: 'success',
  archived: 'neutral',
}

/** Folders as an indented list, children under their parent */
export function folderTree(folders: DocumentFolder[]) {
  const children = new Map<string | null, DocumentFolder[]>()
  for (const folder of folders) {
    const list = children.get(folder.parentId) ?? []
    list.push(folder)
    children.set(folder.parentId, list)
  }
  const result: Array<DocumentFolder & { depth: number; path: string }> = []
  const walk = (parentId: string | null, depth: number, prefix: string) => {
    for (const folder of children.get(parentId) ?? []) {
      const path = prefix ? `${prefix} / ${folder.name}` : folder.name
      result.push({ ...folder, depth, path })
      walk(folder.id, depth + 1, path)
    }
  }
  walk(null, 0, '')
  // A folder whose parent the person cannot see still shows (at the root)
  const seen = new Set(result.map((f) => f.id))
  for (const folder of folders)
    if (!seen.has(folder.id)) result.push({ ...folder, depth: 0, path: folder.name })
  return result
}

/** Ids of a folder and every folder below it */
export function descendantsOf(folders: DocumentFolder[], id: string) {
  const ids = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const folder of folders)
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id)
        grew = true
      }
  }
  return ids
}

/** Days until a document expires (negative: already expired), in Bogotá */
export function daysToExpiry(document: Pick<DocumentItem, 'expiresOn'>) {
  if (!document.expiresOn) return null
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
  const ms = Date.parse(`${document.expiresOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

export function expiryLabel(days: number | null) {
  if (days === null) return null
  if (days < 0) return days === -1 ? 'Venció ayer' : `Venció hace ${-days} días`
  if (days === 0) return 'Vence hoy'
  if (days === 1) return 'Vence mañana'
  return `Vence en ${days} días`
}

/** Opens a file in a new tab, opened before the await so it is not blocked as a pop-up */
export async function openDocumentFile(load: () => Promise<{ data: { url: string } }>) {
  const tab = window.open('', '_blank')
  try {
    const { data } = await load()
    if (tab) tab.location.href = data.url
    else window.location.href = data.url
  } catch (error) {
    tab?.close()
    throw error
  }
}

export async function downloadDocumentFile(load: () => Promise<{ data: { url: string } }>) {
  const { data } = await load()
  const link = document.createElement('a')
  link.href = data.url
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
