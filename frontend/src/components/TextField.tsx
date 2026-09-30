import { forwardRef, useId, type InputHTMLAttributes } from 'react'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  /** Message in plain Portuguese; highlights the field when present (ONF01, ONF02). */
  error?: string
  /** Extra guidance shown below the field. */
  hint?: string
}

/**
 * Labeled input with an accessible error message. Works with React Hook Form:
 *
 * <TextField label="E-mail" type="email" error={errors.email?.message} {...register('email')} />
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, error, hint, id, className, ...props }, ref) {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const hintId = hint ? `${inputId}-hint` : undefined
    const errorId = error ? `${inputId}-error` : undefined
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

    return (
      <div className={className}>
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-800"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:bg-slate-100 ${
            error ? 'border-red-600' : 'border-slate-300'
          }`}
          {...props}
        />
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
