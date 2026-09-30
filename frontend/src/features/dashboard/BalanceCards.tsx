import { formatCurrency } from '../../lib/format'
import { SectionError } from '../../components/SectionError'
import { useBalanceSummaryQuery } from './useDashboard'

type BalanceCardsProps = {
  month: string
}

export function BalanceCards({ month }: BalanceCardsProps) {
  const query = useBalanceSummaryQuery(month)

  if (query.isPending) {
    return (
      <p role="status" className="text-slate-600">
        Carregando saldo…
      </p>
    )
  }

  if (query.isError) {
    return (
      <SectionError
        message="Não foi possível carregar o saldo agora. Tente novamente."
        onRetry={() => query.refetch()}
      />
    )
  }

  const { balance, income, expense } = query.data
  const cards = [
    {
      label: 'Saldo atual',
      value: balance,
      color: balance < 0 ? 'text-red-700' : 'text-slate-900',
    },
    { label: 'Entradas do mês', value: income, color: 'text-emerald-700' },
    { label: 'Saídas do mês', value: expense, color: 'text-red-700' },
  ]

  return (
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
  )
}
