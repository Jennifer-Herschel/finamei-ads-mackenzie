import { useState } from 'react'
import { SectionError } from '../../components/SectionError'
import { getApiErrorBody } from '../../lib/api-error'
import type { ExportFormat, ReportFilters, ReportPeriod } from './report-api'
import { ReportSummary } from './ReportSummary'
import { useExportReportMutation, useReportQuery } from './useReports'

const YEARS_AVAILABLE = 5

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long' })

const monthNames = Array.from({ length: 12 }, (_, index) =>
  monthFormatter.format(new Date(2026, index, 1)),
)

const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1)

const formatLabels: Record<ExportFormat, string> = {
  PDF: 'PDF',
  XLSX: 'planilha',
}

const selectClass =
  'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600'

const buttonBase =
  'rounded-lg px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'

function describePeriod({ period, year, month }: ReportFilters) {
  return period === 'MONTHLY'
    ? `Relatório de ${monthNames[month - 1]} de ${year}`
    : `Relatório anual de ${year}`
}

type ReportsPageProps = {
  /** Reference date; defaults to now. Useful in tests. */
  today?: Date
}

export function ReportsPage({ today = new Date() }: ReportsPageProps) {
  const currentYear = today.getFullYear()
  const [filters, setFilters] = useState<ReportFilters>({
    period: 'MONTHLY',
    year: currentYear,
    month: today.getMonth() + 1,
  })
  const reportQuery = useReportQuery(filters)
  const exportMutation = useExportReportMutation()

  const years = Array.from(
    { length: YEARS_AVAILABLE },
    (_, index) => currentYear - index,
  )

  const updateFilters = (next: Partial<ReportFilters>) => {
    exportMutation.reset()
    setFilters((current) => ({ ...current, ...next }))
  }

  const exportAs = (format: ExportFormat) =>
    exportMutation.mutate({ filters, format })

  const report = reportQuery.data
  const exportingFormat = exportMutation.isPending
    ? exportMutation.variables?.format
    : undefined

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Relatórios
        </h1>
        <p className="mt-1 text-slate-600">
          Consulte receitas, despesas, saldo e faturamento por mês ou por ano.
        </p>
      </header>

      <form
        aria-label="Filtros do relatório"
        onSubmit={(event) => event.preventDefault()}
        className="mt-6 grid gap-3 sm:grid-cols-3"
      >
        <div>
          <label
            htmlFor="report-period"
            className="block text-sm font-medium text-slate-800"
          >
            Tipo
          </label>
          <select
            id="report-period"
            className={selectClass}
            value={filters.period}
            onChange={(event) =>
              updateFilters({ period: event.target.value as ReportPeriod })
            }
          >
            <option value="MONTHLY">Mensal</option>
            <option value="ANNUAL">Anual</option>
          </select>
        </div>

        {filters.period === 'MONTHLY' && (
          <div>
            <label
              htmlFor="report-month"
              className="block text-sm font-medium text-slate-800"
            >
              Mês
            </label>
            <select
              id="report-month"
              className={selectClass}
              value={filters.month}
              onChange={(event) =>
                updateFilters({ month: Number(event.target.value) })
              }
            >
              {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>
                  {capitalize(name)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor="report-year"
            className="block text-sm font-medium text-slate-800"
          >
            Ano
          </label>
          <select
            id="report-year"
            className={selectClass}
            value={filters.year}
            onChange={(event) =>
              updateFilters({ year: Number(event.target.value) })
            }
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </form>

      <section
        aria-labelledby="report-title"
        aria-busy={reportQuery.isFetching}
        className="mt-6"
      >
        <h2 id="report-title" className="text-lg font-semibold text-slate-900">
          {describePeriod(filters)}
        </h2>

        <div className="mt-3">
          {reportQuery.isPending && (
            <p role="status" className="text-slate-600">
              Carregando relatório…
            </p>
          )}

          {reportQuery.isError && !report && (
            <SectionError
              message="Não foi possível carregar o relatório agora. Tente novamente."
              onRetry={() => reportQuery.refetch()}
            />
          )}

          {report && (
            <div
              className={
                reportQuery.isPlaceholderData ? 'opacity-60' : undefined
              }
            >
              <ReportSummary report={report} />
            </div>
          )}
        </div>

        {report && (
          <div className="mt-6 space-y-3">
            {exportMutation.isError && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {getApiErrorBody(exportMutation.error)?.message ??
                  'Não foi possível gerar o arquivo. Tente novamente.'}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              {(['PDF', 'XLSX'] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => exportAs(format)}
                  disabled={
                    exportMutation.isPending || reportQuery.isPlaceholderData
                  }
                  className={`${buttonBase} ${
                    format === 'PDF'
                      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                      : 'border border-emerald-700 text-emerald-800 hover:bg-emerald-50'
                  }`}
                >
                  {exportingFormat === format
                    ? `Gerando ${formatLabels[format]}…`
                    : `Exportar ${formatLabels[format]}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
