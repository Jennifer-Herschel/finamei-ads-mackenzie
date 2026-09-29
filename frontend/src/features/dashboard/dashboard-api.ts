import { apiFetch } from '../../lib/http'
import type { RevenueSummary } from '../revenue/revenue-types'

/**
 * Contract proposed to the backend (OF11-OF13, modules `transaction` and
 * `revenue`). Monetary values are JSON numbers in BRL.
 *
 * GET /transactions/summary?month=YYYY-MM -> 200 BalanceSummary
 */
export type BalanceSummary = {
  month: string
  /** Current balance: all income minus all expenses up to today. */
  balance: number
  /** Income registered in the month. */
  income: number
  /** Expenses registered in the month. */
  expense: number
}

export function fetchBalanceSummary(token: string | null, month: string) {
  const query = new URLSearchParams({ month })
  return apiFetch<BalanceSummary>(`/transactions/summary?${query}`, { token })
}

/** GET /revenue/summary?year=YYYY -> 200 RevenueSummary */
export function fetchRevenueSummary(token: string | null, year: number) {
  const query = new URLSearchParams({ year: String(year) })
  return apiFetch<RevenueSummary>(`/revenue/summary?${query}`, { token })
}
