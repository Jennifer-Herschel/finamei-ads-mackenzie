import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { SelectField } from '../../components/SelectField'
import { TextField } from '../../components/TextField'
import { useCategoriesQuery } from '../category/useCategories'
import { EMPTY_FILTERS, type TransactionFilters } from './transaction-api'
import {
  transactionFiltersSchema,
  type TransactionFiltersValues,
} from './transaction-filters-schema'

type TransactionFiltersFormProps = {
  filters: TransactionFilters
  onApply: (filters: TransactionFilters) => void
}

const buttonBase =
  'rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'

/** Filters by period, type, category and description (OF09). */
export function TransactionFiltersForm({
  filters,
  onApply,
}: TransactionFiltersFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<TransactionFiltersValues>({
    resolver: zodResolver(transactionFiltersSchema),
    defaultValues: filters,
  })
  const type = useWatch({ control, name: 'type' })
  // Categories depend on the type; they are only offered once it is chosen.
  const categoriesQuery = useCategoriesQuery(type || 'INCOME')

  return (
    <form
      noValidate
      aria-label="Filtros das movimentações"
      onSubmit={handleSubmit(onApply)}
      className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2"
    >
      <TextField
        id="filter-from"
        label="Período: de"
        type="date"
        error={errors.from?.message}
        {...register('from')}
      />
      <TextField
        id="filter-to"
        label="Período: até"
        type="date"
        error={errors.to?.message}
        {...register('to')}
      />
      <SelectField
        id="filter-type"
        label="Filtrar por tipo"
        {...register('type', {
          onChange: () => setValue('categoryId', ''),
        })}
      >
        <option value="">Todos</option>
        <option value="INCOME">Receitas</option>
        <option value="EXPENSE">Despesas</option>
      </SelectField>
      <SelectField
        id="filter-category"
        label="Filtrar por categoria"
        disabled={!type}
        hint={type ? undefined : 'Escolha o tipo para filtrar por categoria.'}
        {...register('categoryId')}
      >
        <option value="">Todas</option>
        {type &&
          categoriesQuery.data?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
      </SelectField>
      <TextField
        id="filter-description"
        label="Filtrar por descrição"
        className="sm:col-span-2"
        {...register('description')}
      />
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button
          type="submit"
          className={`${buttonBase} bg-emerald-700 text-white hover:bg-emerald-800`}
        >
          Filtrar
        </button>
        <button
          type="button"
          onClick={() => {
            reset(EMPTY_FILTERS)
            onApply(EMPTY_FILTERS)
          }}
          className={`${buttonBase} border border-slate-300 text-slate-800 hover:bg-slate-50`}
        >
          Limpar filtros
        </button>
      </div>
    </form>
  )
}
