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

export function useReportQuery(basePath: string, filters: ReportFilters) {
  const { token } = useAuth()
  const authorizedFetch = useAuthorizedFetch()
  return useQuery({
    queryKey: ['reports', basePath, filters],
    queryFn: () => authorizedFetch((t) => fetchReport(t, basePath, filters)),
    enabled: Boolean(token),
    // Keep the current report on screen while another period loads.
    placeholderData: keepPreviousData,
  })
}

export function useExportReportMutation(basePath: string) {
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
        downloadReport(t, basePath, filters, format),
      )
      saveFile(file.blob, file.filename ?? defaultFilename(filters, format))
    },
  })
}
