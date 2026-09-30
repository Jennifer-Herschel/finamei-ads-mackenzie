import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toIsoDate } from '../../lib/format'
import {
  EMPTY_FILTERS,
  type Transaction,
  type TransactionFilters,
  type TransactionType,
} from './transaction-api'
import { TransactionFiltersForm } from './TransactionFiltersForm'
import { TransactionForm } from './TransactionForm'
import { TransactionList } from './TransactionList'

type TransactionsPageProps = {
  /** Reference date; defaults to now. Useful in tests. */
  today?: Date
}

export function TransactionsPage({
  today = new Date(),
}: TransactionsPageProps) {
  // The dashboard links here with ?tipo=receita or ?tipo=despesa.
  const [searchParams] = useSearchParams()
  const initialType: TransactionType =
    searchParams.get('tipo') === 'despesa' ? 'EXPENSE' : 'INCOME'
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Lançamentos
        </h1>
        <p className="mt-1 text-slate-600">
          Registre receitas e despesas e acompanhe as movimentações do seu
          negócio.
        </p>
      </header>

      {notice && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {notice}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section
          aria-labelledby="transaction-form-title"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2 lg:self-start"
        >
          <h2
            id="transaction-form-title"
            className="text-lg font-semibold text-slate-900"
          >
            {editing ? 'Editar lançamento' : 'Novo lançamento'}
          </h2>
          {editing ? (
            <TransactionForm
              key={editing.id}
              todayIso={toIsoDate(today)}
              initialType={editing.type}
              transaction={editing}
              onSaved={(message) => {
                setEditing(null)
                setNotice(message)
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <TransactionForm
              key={initialType}
              todayIso={toIsoDate(today)}
              initialType={initialType}
            />
          )}
        </section>

        <section
          aria-labelledby="transactions-title"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-3"
        >
          <h2
            id="transactions-title"
            className="text-lg font-semibold text-slate-900"
          >
            Movimentações
          </h2>
          <TransactionFiltersForm filters={filters} onApply={setFilters} />
          <TransactionList
            // New filters start again from the first page.
            key={JSON.stringify(filters)}
            filters={filters}
            editingId={editing?.id ?? null}
            onEdit={(transaction) => {
              setNotice(null)
              setEditing(transaction)
            }}
            onDeleted={(transactionId) => {
              if (editing?.id === transactionId) setEditing(null)
            }}
          />
        </section>
      </div>
    </main>
  )
}
