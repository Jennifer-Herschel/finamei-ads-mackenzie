import { useState } from 'react'
import { SectionError } from '../../components/SectionError'
import type { TransactionType } from '../transaction/transaction-api'
import { CategoryItem } from './CategoryItem'
import { CategoryNameForm } from './CategoryNameForm'
import {
  useAllCategoriesQuery,
  useCreateCategoryMutation,
} from './useCategories'

const typeOptions: { value: TransactionType; label: string; noun: string }[] = [
  { value: 'INCOME', label: 'Receitas', noun: 'receita' },
  { value: 'EXPENSE', label: 'Despesas', noun: 'despesa' },
]

/** Create, rename and inactivate income and expense categories (OF10, RN07). */
export function CategoriesPage() {
  const [type, setType] = useState<TransactionType>('INCOME')
  const [message, setMessage] = useState<string | null>(null)
  const query = useAllCategoriesQuery(type)
  const createMutation = useCreateCategoryMutation()
  const noun = typeOptions.find((option) => option.value === type)!.noun

  // Active first, then alphabetical.
  const categories = [...(query.data ?? [])].sort(
    (a, b) =>
      Number(b.active) - Number(a.active) ||
      a.name.localeCompare(b.name, 'pt-BR'),
  )

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Categorias
        </h1>
        <p className="mt-1 text-slate-600">
          Organize as categorias das suas receitas e despesas. Categorias não
          são excluídas, apenas inativadas, para não perder o histórico dos
          lançamentos.
        </p>
      </header>

      <fieldset className="mt-6">
        <legend className="sr-only">Tipo de categoria</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 sm:max-w-xs">
          {typeOptions.map((option) => (
            <label
              key={option.value}
              className="cursor-pointer rounded-md px-3 py-2 text-center text-sm font-semibold text-slate-700 has-[:checked]:bg-white has-[:checked]:text-emerald-800 has-[:checked]:shadow-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-700"
            >
              <input
                type="radio"
                name="category-type"
                value={option.value}
                checked={type === option.value}
                onChange={() => {
                  setMessage(null)
                  createMutation.reset()
                  setType(option.value)
                }}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <section
        aria-label={`Categorias de ${noun}`}
        className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <CategoryNameForm
          // Start clean when switching between income and expense.
          key={type}
          label={`Nova categoria de ${noun}`}
          submitLabel="Adicionar"
          pendingLabel="Adicionando…"
          isPending={createMutation.isPending}
          onSubmit={(name) => createMutation.mutateAsync({ name, type })}
          onSaved={(name) => setMessage(`Categoria "${name}" criada.`)}
        />

        {message && (
          <p role="status" className="mt-3 text-sm text-emerald-800">
            {message}
          </p>
        )}

        <div className="mt-4 border-t border-slate-200">
          {query.isPending && (
            <p role="status" className="mt-3 text-slate-600">
              Carregando categorias…
            </p>
          )}
          {query.isError && (
            <div className="mt-3">
              <SectionError
                message="Não foi possível carregar as categorias agora. Tente novamente."
                onRetry={() => query.refetch()}
              />
            </div>
          )}
          {query.data?.length === 0 && (
            <p className="mt-3 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
              Nenhuma categoria de {noun} ainda. Crie a primeira acima.
            </p>
          )}
          {categories.length > 0 && (
            <ul
              aria-label={`Lista de categorias de ${noun}`}
              className="divide-y divide-slate-200"
            >
              {categories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  onChanged={setMessage}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  )
}
