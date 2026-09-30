import { apiDownload, apiFetch } from '../../lib/http'
import type { RevenueSummary } from '../revenue/revenue-types'

/**
 * Contract proposed to the backend (OF15, OF16, module `report`).
 * Monetary values are JSON numbers in BRL.
 */
export type ReportPeriod = 'MONTHLY' | 'ANNUAL'

export type ReportFilters = {
  period: ReportPeriod
  year: number
  /** 1-12; only used by monthly reports. */
  month: number
}

export type Report = {
  period: ReportPeriod
  year: number
  month: number | null
  income: number
  expense: number
  /** income - expense within the period. */
  balance: number
  /** Number of transactions in the period; 0 means an empty report (UC 3a). */
  transactionCount: number
  /** Accumulated revenue of the report's year against the MEI limit (RN01-RN04). */
  revenue: RevenueSummary
}

export type ExportFormat = 'PDF' | 'XLSX'

function toQuery({ period, year, month }: ReportFilters) {
  const query = new URLSearchParams({ period, year: String(year) })
  if (period === 'MONTHLY') query.set('month', String(month))
  return query
}

/** Reports of the signed-in MEI. */
export const OWN_REPORTS_PATH = '/reports'

/** GET {basePath}?period=MONTHLY&year=2026&month=9 -> 200 Report */
export function fetchReport(
  token: string | null,
  basePath: string,
  filters: ReportFilters,
) {
  return apiFetch<Report>(`${basePath}?${toQuery(filters)}`, { token })
}

/** GET {basePath}/export?period=...&format=PDF|XLSX -> 200 file */
export function downloadReport(
  token: string | null,
  basePath: string,
  filters: ReportFilters,
  format: ExportFormat,
) {
  const query = toQuery(filters)
  query.set('format', format)
  return apiDownload(`${basePath}/export?${query}`, { token })
}
