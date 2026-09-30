import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { FormAlert } from '../../components/FormAlert'
import { TextField } from '../../components/TextField'
import { getApiErrorMessage } from '../../lib/api-error'
import { applyApiFieldErrors } from '../../lib/form-errors'
import { HttpError } from '../../lib/http'
import {
  CATEGORY_FIELDS,
  categoryNameSchema,
  DUPLICATE_NAME_MESSAGE,
  type CategoryNameValues,
} from './category-schema'

const buttonBase =
  'rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'

type CategoryNameFormProps = {
  label: string
  submitLabel: string
  pendingLabel: string
  defaultName?: string
  autoFocus?: boolean
  isPending: boolean
  /** Saves the name; must reject with the API error so it can be shown. */
  onSubmit: (name: string) => Promise<unknown>
  /** Called after saving; the form clears itself when there is no onCancel. */
  onSaved: (name: string) => void
  onCancel?: () => void
}

/** Name of a category, used both to create and to rename one (OF10). */
export function CategoryNameForm({
  label,
  submitLabel,
  pendingLabel,
  defaultName = '',
  autoFocus,
  isPending,
  onSubmit,
  onSaved,
  onCancel,
}: CategoryNameFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CategoryNameValues>({
    resolver: zodResolver(categoryNameSchema),
    defaultValues: { name: defaultName },
  })

  const submit = handleSubmit(async ({ name }) => {
    setFormError(null)
    try {
      await onSubmit(name)
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        setError(
          'name',
          { message: DUPLICATE_NAME_MESSAGE },
          { shouldFocus: true },
        )
      } else if (!applyApiFieldErrors(error, CATEGORY_FIELDS, setError)) {
        setFormError(getApiErrorMessage(error))
      }
      return
    }
    if (!onCancel) reset({ name: '' })
    onSaved(name)
  })

  return (
    <form noValidate onSubmit={submit} className="space-y-3">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <TextField
          label={label}
          autoFocus={autoFocus}
          autoComplete="off"
          error={errors.name?.message}
          className="flex-1"
          {...register('name')}
        />
        <div className="flex gap-2 sm:mt-6">
          <button
            type="submit"
            disabled={isPending}
            className={`${buttonBase} bg-emerald-700 text-white hover:bg-emerald-800`}
          >
            {isPending ? pendingLabel : submitLabel}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className={`${buttonBase} border border-slate-300 text-slate-800 hover:bg-slate-50`}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
