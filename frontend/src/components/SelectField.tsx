import { forwardRef, useId, type SelectHTMLAttributes } from 'react'

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  /** Message in plain Portuguese; highlights the field when present (ONF01, ONF02). */
  error?: string
  /** Extra guidance shown below the field. */
  hint?: string
}

/**
 * Labeled select with an accessible error message, the counterpart of
 * TextField. Works with React Hook Form:
 *
 * <SelectField label="Categoria" error={errors.categoryId?.message} {...register('categoryId')}>
 *   <option value="">Selecione</option>
 * </SelectField>
 */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField(
    { label, error, hint, id, className, children, ...props },
    ref,
  ) {
    const generatedId = useId()
    const selectId = id ?? generatedId
    const hintId = hint ? `${selectId}-hint` : undefined
    const errorId = error ? `${selectId}-error` : undefined
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

    return (
      <div className={className}>
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-slate-800"
        >
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={`mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:bg-slate-100 ${
            error ? 'border-red-600' : 'border-slate-300'
          }`}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-700">
            {error}
          </p>
        )}
        {hint && (
          <p id={hintId} className="mt-1 text-sm text-slate-500">
            {hint}
          </p>
        )}
      </div>
    )
  },
)
