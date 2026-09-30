import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { FormAlert } from '../../components/FormAlert'
import { SectionError } from '../../components/SectionError'
import { SelectField } from '../../components/SelectField'
import { TextField } from '../../components/TextField'
import { getApiErrorMessage } from '../../lib/api-error'
import { applyApiFieldErrors } from '../../lib/form-errors'
import { useCategoriesQuery } from '../category/useCategories'
import type { TransactionType } from './transaction-api'
import {
  createTransactionSchema,
  TRANSACTION_FIELDS,
  type TransactionFormOutput,
  type TransactionFormValues,
} from './transaction-schema'
import { useCreateTransactionMutation } from './useTransactions'

const typeOptions: { value: TransactionType; label: string }[] = [
  { value: 'INCOME', label: 'Receita' },
  { value: 'EXPENSE', label: 'Despesa' },
]

const typeLabels: Record<TransactionType, string> = {
  INCOME: 'receita',
  EXPENSE: 'despesa',
}

type TransactionFormProps = {
  /** Reference date (YYYY-MM-DD): the default date and the latest one allowed. */
  todayIso: string
  initialType: TransactionType
}

/** Registers an income (OF05) or an expense (OF07). */
export function TransactionForm({
  todayIso,
  initialType,
}: TransactionFormProps) {
  const schema = useMemo(() => createTransactionSchema(todayIso), [todayIso])
  const mutation = useCreateTransactionMutation()
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    control,
    formState: { errors },
  } = useForm<TransactionFormValues, unknown, TransactionFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: initialType,
      amount: '',
      date: todayIso,
      categoryId: '',
      description: '',
    },
  })

  const type = useWatch({ control, name: 'type' })
  const categoriesQuery = useCategoriesQuery(type)

  const clearFeedback = () => setSuccessMessage(null)

  // Fields stay enabled while saving: a server field error must be able to
  // take the focus (ONF01). The submit button prevents double submissions.
  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    setSuccessMessage(null)

    mutation.mutate(values, {
      onSuccess: () => {
        // Keep type and date: people often register several in a row.
        reset({
          type: values.type,
          amount: '',
          date: values.date,
          categoryId: '',
          description: '',
        })
        setSuccessMessage(
          values.type === 'INCOME'
            ? 'Receita registrada com sucesso.'
            : 'Despesa registrada com sucesso.',
        )
      },
      onError: (error) => {
        if (!applyApiFieldErrors(error, TRANSACTION_FIELDS, setError)) {
          setFormError(getApiErrorMessage(error))
        }
      },
    })
  })

  return (
    <form noValidate onSubmit={onSubmit} className="mt-4 space-y-5">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      {successMessage && <FormAlert tone="success">{successMessage}</FormAlert>}

      <fieldset>
        <legend className="block text-sm font-medium text-slate-800">
          Tipo
        </legend>
        <div className="mt-1 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          {typeOptions.map((option) => (
            <label
              key={option.value}
              className="cursor-pointer rounded-md px-3 py-2 text-center text-sm font-semibold text-slate-700 has-[:checked]:bg-white has-[:checked]:text-emerald-800 has-[:checked]:shadow-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-700"
            >
              <input
                type="radio"
                value={option.value}
                className="sr-only"
                {...register('type', {
                  onChange: () => {
                    // Income and expense have different categories.
                    setValue('categoryId', '')
                    clearFeedback()
                  },
                })}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <TextField
        id="transaction-amount"
        label="Valor (R$)"
        inputMode="decimal"
        placeholder="0,00"
        hint="Use vírgula para os centavos."
        error={errors.amount?.message}
        {...register('amount', { onChange: clearFeedback })}
      />

      <TextField
        id="transaction-date"
        label="Data"
        type="date"
        max={todayIso}
        error={errors.date?.message}
        {...register('date', { onChange: clearFeedback })}
      />

      {categoriesQuery.isError ? (
        <SectionError
          message="Não foi possível carregar as categorias. Tente novamente."
          onRetry={() => categoriesQuery.refetch()}
        />
      ) : (
        <SelectField
          id="transaction-category"
          label="Categoria"
          error={errors.categoryId?.message}
          disabled={categoriesQuery.isPending}
          {...register('categoryId', { onChange: clearFeedback })}
        >
          <option value="">
            {categoriesQuery.isPending
              ? 'Carregando categorias…'
              : 'Selecione uma categoria'}
          </option>
          {categoriesQuery.data?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
      )}

      <TextField
        id="transaction-description"
        label="Descrição"
        hint="Até 120 caracteres."
        error={errors.description?.message}
        {...register('description', { onChange: clearFeedback })}
      />

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mutation.isPending ? 'Registrando…' : `Registrar ${typeLabels[type]}`}
      </button>
    </form>
  )
}
