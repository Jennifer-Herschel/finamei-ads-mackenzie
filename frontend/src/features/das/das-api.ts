import { apiFetch } from '../../lib/http'

/**
 * Contract proposed to the backend (OF14, RN05, module `das`).
 * Dates are ISO 8601 (YYYY-MM-DD); amounts are JSON numbers in BRL.
 */
export type DasStatus = 'PAID' | 'PENDING' | 'OVERDUE'

export type DasGuide = {
  id: string
  /** Month the guide refers to (apuração), "YYYY-MM". */
  referenceMonth: string
  amount: number
  /**
   * Day 20 of the following month, moved to the next business day on
   * weekends and holidays (RN05). Computed by the backend.
   */
  dueDate: string
  /** OVERDUE: not paid after the due date (RN05). Computed by the backend. */
  status: DasStatus
  paidAt: string | null
}

export const DAS_PATH = '/das'

/** GET /das?year=2026 -> 200 DasGuide[] (the 12 months of the year) */
export function fetchDasGuides(token: string | null, year: number) {
  const query = new URLSearchParams({ year: String(year) })
  return apiFetch<DasGuide[]>(`${DAS_PATH}?${query}`, { token })
}

/**
 * PUT /das/{id}/payment { paidAt } -> 200 DasGuide
 *   400 VALIDATION_ERROR with fieldErrors.paidAt (e.g. future date)
 */
export function markDasAsPaid(
  token: string | null,
  id: string,
  paidAt: string,
) {
  return apiFetch<DasGuide>(`${DAS_PATH}/${encodeURIComponent(id)}/payment`, {
    token,
    method: 'PUT',
    body: JSON.stringify({ paidAt }),
  })
}

/**
 * DELETE /das/{id}/payment -> 200 DasGuide back to pending. The backend keeps
 * the change in the audit log (UC 3a, ONF10).
 */
export function undoDasPayment(token: string | null, id: string) {
  return apiFetch<DasGuide>(`${DAS_PATH}/${encodeURIComponent(id)}/payment`, {
    token,
    method: 'DELETE',
  })
}
