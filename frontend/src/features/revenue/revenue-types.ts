/** RN02 bands: < 80%, 80-89.99%, 90-99.99%, >= 100% of the limit. */
export type RevenueBand = 'NORMAL' | 'ATTENTION' | 'CRITICAL' | 'EXCEEDED'

/** Mirrors RevenueSummaryResponse from the backend (module `revenue`). */
export type RevenueSummary = {
  year: number
  /** Income of the calendar year only; expenses are not included (RN03, RN04). */
  accumulatedAmount: number
  /** Annual limit in force (RN01). */
  annualLimit: number
  /** Share of the limit already reached, rounded to 2 decimals by the backend. */
  percentage: number
  /** Classified by the backend from the exact amounts (RN02). */
  band: RevenueBand
  /**
   * Not sent by the backend yet: set when the MEI opened during the year and
   * the limit is proportional to the months of activity (RN01).
   */
  proportionalLimit?: boolean
  activeMonths?: number | null
}
