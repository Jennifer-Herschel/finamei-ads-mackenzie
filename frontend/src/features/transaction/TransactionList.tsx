import { useState } from 'react'
import { SectionError } from '../../components/SectionError'
import { formatCurrency, formatDate } from '../../lib/format'
import { useTransactionsQuery } from './useTransactions'

const pageButton =
  'rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'

/** Simple list of the MEI's transactions, newest first (no filters yet). */
export function TransactionList() {
  const [page, setPage] = useState(0)
  const query = useTransactionsQuery(page)

  if (query.isPending) {
    return (
      <p role="status" className="mt-3 text-slate-600">
        Carregando movimentações…
      </p>
    )
  }

  if (query.isError && !query.data) {
    return (
      <div className="mt-3">
        <SectionError
          message="Não foi possível carregar as movimentações agora. Tente novamente."
          onRetry={() => query.refetch()}
        />
      </div>
    )
  }

  const { content, number, totalPages } = query.data

  if (content.length === 0) {
    return (
      <p className="mt-3 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
        Nenhum lançamento registrado ainda. Use o formulário para registrar sua
        primeira receita ou despesa.
      </p>
    )
  }

  return (
    <div className={query.isPlaceholderData ? 'opacity-60' : undefined}>
      <ul
        aria-label="Lista de movimentações"
        className="mt-2 divide-y divide-slate-200"
      >
        {content.map((transaction) => {
          const isIncome = transaction.type === 'INCOME'
          return (
            <li
              key={transaction.id}
              className="flex items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="break-words font-medium text-slate-900">
                  {transaction.description}
                </p>
                <p className="text-sm text-slate-600">
                  {transaction.category.name} · {formatDate(transaction.date)}
                </p>
              </div>
              <p
                className={`shrink-0 font-semibold ${
                  isIncome ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                <span className="sr-only">
                  {isIncome ? 'Receita: ' : 'Despesa: '}
                </span>
                <span aria-hidden="true">{isIncome ? '+ ' : '− '}</span>
                {formatCurrency(transaction.amount)}
              </p>
            </li>
          )
        })}
      </ul>

      {totalPages > 1 && (
        <nav
          aria-label="Paginação das movimentações"
          className="mt-4 flex items-center justify-between gap-3"
        >
          <button
            type="button"
            onClick={() => setPage(number - 1)}
            disabled={number === 0 || query.isPlaceholderData}
            className={pageButton}
          >
            Anterior
          </button>
          <span className="text-sm text-slate-600">
            Página {number + 1} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(number + 1)}
            disabled={number + 1 >= totalPages || query.isPlaceholderData}
            className={pageButton}
          >
            Próxima
          </button>
        </nav>
      )}
    </div>
  )
}
