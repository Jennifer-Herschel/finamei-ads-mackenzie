import { apiFetch } from '../../lib/http'

/**
 * Contract proposed to the backend (OF17, RN11, module `accountant`).
 * Every route is read-only and only returns clients that granted access.
 */
export type LinkedClient = {
  /** Id of the MEI user who granted access. */
  id: string
  name: string
  email: string
  /** ISO 8601 date the access was granted. */
  grantedAt: string
}

/** GET /accountant/clients -> 200 LinkedClient[] */
export function fetchLinkedClients(token: string | null) {
  return apiFetch<LinkedClient[]>('/accountant/clients', { token })
}

/**
 * Base path of a client's reports; the report endpoints below it mirror the
 * MEI ones (GET {path}?period=... and GET {path}/export?...).
 * 403/404 means the client revoked the access or never granted it.
 */
export function clientReportsPath(clientId: string) {
  return `/accountant/clients/${encodeURIComponent(clientId)}/reports`
}
