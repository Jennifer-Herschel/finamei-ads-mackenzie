/** RN02 bands: < 80%, 80-89.99%, 90-99.99%, >= 100% of the limit. */
export type RevenueBand = 'NORMAL' | 'ATTENTION' | 'CRITICAL' | 'EXCEEDED'

/** Mirrors RevenueSummaryResponse from the backend (GET /revenue/summary). */
export type RevenueSummary = {
  year: number
  /** Income of the calendar year only; expenses are not included (RN03, RN04). */
  accumulated: number
  /** Annual limit in force, already proportional when applicable (RN01). */
  limit: number
  /** Share of the limit already reached, rounded to 2 decimals by the backend. */
  percentage: number
  /** Classified by the backend from the exact amounts (RN02). */
  band: RevenueBand
  /** True when the MEI opened during the year and the limit is proportional (RN01). */
  proportionalLimit: boolean
  /** Months of activity used for the proportional limit, or null. */
  activeMonths: number | null
}
