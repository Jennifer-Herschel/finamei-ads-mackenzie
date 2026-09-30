import { useState } from 'react'
import { SectionError } from '../../components/SectionError'
import {
  EMPTY_FILTERS,
  type Transaction,
  type TransactionFilters,
} from './transaction-api'
import { TransactionItem } from './TransactionItem'
import { useTransactionsQuery } from './useTransactions'

const pageButton =
  'rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'

type TransactionListProps = {
  filters?: TransactionFilters
  editingId?: string | null
  onEdit?: (transaction: Transaction) => void
  onDeleted?: (transactionId: string) => void
}

/** The MEI's transactions, newest first, with edit and delete (OF06, OF08, OF09). */
export function TransactionList({
  filters = EMPTY_FILTERS,
  editingId = null,
  onEdit,
  onDeleted,
}: TransactionListProps) {
  const [page, setPage] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const query = useTransactionsQuery(page, filters)
  const isFiltered = Object.values(filters).some((value) => value.trim())

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

  const feedback = message && (
    <p role="status" className="mt-3 text-sm text-emerald-800">
      {message}
    </p>
  )

  if (content.length === 0) {
    return (
      <>
        {feedback}
        <p className="mt-3 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
          {isFiltered
            ? 'Nenhum lançamento encontrado com esses filtros.'
            : 'Nenhum lançamento registrado ainda. Use o formulário para registrar sua primeira receita ou despesa.'}
        </p>
      </>
    )
  }

  return (
    <div className={query.isPlaceholderData ? 'opacity-60' : undefined}>
      {feedback}
      <ul
        aria-label="Lista de movimentações"
        className="mt-2 divide-y divide-slate-200"
      >
        {content.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            isEditing={transaction.id === editingId}
            onEdit={() => {
              setMessage(null)
              onEdit?.(transaction)
            }}
            onDeleted={(text) => {
              setMessage(text)
              onDeleted?.(transaction.id)
            }}
          />
        ))}
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
