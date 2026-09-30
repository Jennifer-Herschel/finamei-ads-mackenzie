import { formatCurrency } from '../../lib/format'
import { RevenueProgress } from '../revenue/RevenueProgress'
import type { Report } from './report-api'

/** Read-only view of a consolidated report (OF15). */
export function ReportSummary({ report }: { report: Report }) {
  const cards = [
    { label: 'Receitas', value: report.income, color: 'text-emerald-700' },
    { label: 'Despesas', value: report.expense, color: 'text-red-700' },
    {
      label: 'Saldo',
      value: report.balance,
      color: report.balance < 0 ? 'text-red-700' : 'text-slate-900',
    },
  ]

  return (
    <div className="space-y-4">
      {report.transactionCount === 0 && (
        <p
          role="status"
          className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700"
        >
          Nenhum lançamento neste período. Os valores estão zerados.
        </p>
      )}

      <dl className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <dt className="text-sm text-slate-600">{card.label}</dt>
            <dd className={`mt-1 text-xl font-bold ${card.color}`}>
              {formatCurrency(card.value)}
            </dd>
          </div>
        ))}
      </dl>

      <section
        aria-labelledby="report-revenue-title"
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <h2 id="report-revenue-title" className="font-semibold text-slate-900">
          Faturamento acumulado em {report.revenue.year} (limite do MEI)
        </h2>
        <RevenueProgress summary={report.revenue} />
      </section>
    </div>
  )
}
