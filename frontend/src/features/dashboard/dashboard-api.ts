import { apiFetch } from '../../lib/http'

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

/** RN02 bands: < 80%, 80-89.99%, 90-99.99%, >= 100% of the limit. */
export type RevenueBand = 'NORMAL' | 'ATTENTION' | 'CRITICAL' | 'EXCEEDED'

/**
 * GET /revenue/summary?year=YYYY -> 200 RevenueSummary
 */
export type RevenueSummary = {
  year: number
  /** Income of the calendar year only; expenses are not included (RN03, RN04). */
  accumulated: number
  /** Annual limit in force, already proportional when applicable (RN01). */
  limit: number
  band: RevenueBand
  /** True when the MEI opened during the year and the limit is proportional. */
  proportionalLimit: boolean
  /** Months of activity used for the proportional limit, when applicable. */
  activeMonths: number | null
}

export function fetchBalanceSummary(token: string | null, month: string) {
  const query = new URLSearchParams({ month })
  return apiFetch<BalanceSummary>(`/transactions/summary?${query}`, { token })
}

export function fetchRevenueSummary(token: string | null, year: number) {
  const query = new URLSearchParams({ year: String(year) })
  return apiFetch<RevenueSummary>(`/revenue/summary?${query}`, { token })
}
