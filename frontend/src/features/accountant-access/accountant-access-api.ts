import { apiFetch } from '../../lib/http'

/**
 * Contract proposed to the backend (RN11, entity `AcessoContador`). The MEI
 * grants read-only access to an accountant and can revoke it at any time.
 */
export type AccountantAccess = {
  id: string
  accountant: {
    name: string
    email: string
  }
  /** ISO 8601 date the access was granted. */
  grantedAt: string
}

export const ACCOUNTANT_ACCESS_PATH = '/accountant-access'

/** GET /accountant-access -> 200 AccountantAccess[] (active grants only) */
export function fetchAccountantAccesses(token: string | null) {
  return apiFetch<AccountantAccess[]>(ACCOUNTANT_ACCESS_PATH, { token })
}

/**
 * POST /accountant-access { accountantEmail } -> 201 AccountantAccess
 *   404 when no accountant account uses that e-mail
 *   409 when this accountant already has access
 *   400 VALIDATION_ERROR with fieldErrors.accountantEmail
 */
export function grantAccountantAccess(
  token: string | null,
  accountantEmail: string,
) {
  return apiFetch<AccountantAccess>(ACCOUNTANT_ACCESS_PATH, {
    token,
    method: 'POST',
    body: JSON.stringify({ accountantEmail }),
  })
}

/** DELETE /accountant-access/{id} -> 204, effective immediately (RN11). */
export function revokeAccountantAccess(token: string | null, id: string) {
  return apiFetch<void>(`${ACCOUNTANT_ACCESS_PATH}/${encodeURIComponent(id)}`, {
    token,
    method: 'DELETE',
  })
}
