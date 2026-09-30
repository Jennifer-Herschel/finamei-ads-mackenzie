import { SectionError } from '../../components/SectionError'
import { RevenueProgress } from '../revenue/RevenueProgress'
import { useRevenueSummaryQuery } from './useDashboard'

type RevenueCardProps = {
  year: number
}

export function RevenueCard({ year }: RevenueCardProps) {
  const query = useRevenueSummaryQuery(year)

  return (
    <section
      aria-labelledby="revenue-title"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <h2 id="revenue-title" className="font-semibold text-slate-900">
        Faturamento acumulado em {year}
      </h2>

      {query.isPending && (
        <p role="status" className="mt-3 text-slate-600">
          Carregando faturamento…
        </p>
      )}

      {/* Never show partial numbers when the query fails (UC "Acompanhar faturamento", 4a). */}
      {query.isError && (
        <div className="mt-3">
          <SectionError
            message="Não foi possível carregar o faturamento agora. Tente novamente."
            onRetry={() => query.refetch()}
          />
        </div>
      )}

      {query.data && <RevenueProgress summary={query.data} />}
    </section>
  )
}
