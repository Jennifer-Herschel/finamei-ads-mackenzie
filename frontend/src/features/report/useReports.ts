import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { saveFile } from '../../lib/save-file'
import { useAuth } from '../auth/useAuth'
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch'
import {
  downloadReport,
  fetchReport,
  type ExportFormat,
  type ReportFilters,
} from './report-api'

const extensions: Record<ExportFormat, string> = { PDF: 'pdf', XLSX: 'xlsx' }

function defaultFilename(filters: ReportFilters, format: ExportFormat) {
  const period =
    filters.period === 'MONTHLY'
      ? `${filters.year}-${String(filters.month).padStart(2, '0')}`
      : String(filters.year)
  return `relatorio-finamei-${period}.${extensions[format]}`
}

export function useReportQuery(filters: ReportFilters) {
  const { token } = useAuth()
  const authorizedFetch = useAuthorizedFetch()
  return useQuery({
    queryKey: ['reports', filters],
    queryFn: () => authorizedFetch((t) => fetchReport(t, filters)),
    enabled: Boolean(token),
    // Keep the current report on screen while another period loads.
    placeholderData: keepPreviousData,
  })
}

export function useExportReportMutation() {
  const authorizedFetch = useAuthorizedFetch()
  return useMutation({
    mutationFn: async ({
      filters,
      format,
    }: {
      filters: ReportFilters
      format: ExportFormat
    }) => {
      const file = await authorizedFetch((t) =>
        downloadReport(t, filters, format),
      )
      saveFile(file.blob, file.filename ?? defaultFilename(filters, format))
    },
  })
}
