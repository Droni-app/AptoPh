import { residentApi } from '@/api/resident'
import { errorMessage } from '@/lib/errors'

/**
 * Uploads the receipts picked when reporting a payment. Returns the messages
 * of the files that could not be uploaded (the report is saved anyway).
 */
export async function uploadReceipts(paymentId: string, files: File[]) {
  const failed: string[] = []
  for (const file of files) {
    try {
      await residentApi.finance.attach(paymentId, file)
    } catch (e) {
      failed.push(`${file.name}: ${errorMessage(e)}`)
    }
  }
  return failed
}

/**
 * Opens a receipt in a new tab. The tab is opened before asking for the
 * signed link so the browser does not block it as a pop-up.
 */
export async function openReceipt(id: string) {
  const tab = window.open('', '_blank')
  try {
    const { url } = (await residentApi.finance.attachmentUrl(id)).data
    if (tab) tab.location.href = url
    else window.location.href = url
  } catch (e) {
    tab?.close()
    throw e
  }
}
