import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { getApiErrorBody } from './api-error'

/**
 * Copies the backend `fieldErrors` (400 VALIDATION_ERROR) onto the form fields,
 * focusing the first one. Returns false when no field matched, so the caller
 * can show a message for the whole form instead.
 */
export function applyApiFieldErrors<T extends FieldValues>(
  error: unknown,
  fields: readonly Path<T>[],
  setError: UseFormSetError<T>,
): boolean {
  const matched = Object.entries(
    getApiErrorBody(error)?.fieldErrors ?? {},
  ).filter(([field]) => (fields as readonly string[]).includes(field)) as [
    Path<T>,
    string,
  ][]

  for (const [field, message] of matched) setError(field, { message })

  if (matched.length > 0) {
    const [firstField, firstMessage] = matched[0]
    // Forms disable their fields while saving, and a disabled field cannot
    // take the focus. Focus once the form has re-rendered with them enabled.
    setTimeout(() =>
      setError(firstField, { message: firstMessage }, { shouldFocus: true }),
    )
  }

  return matched.length > 0
}
