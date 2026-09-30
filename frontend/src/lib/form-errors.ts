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
  let applied = false
  for (const [field, message] of Object.entries(
    getApiErrorBody(error)?.fieldErrors ?? {},
  )) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { message }, { shouldFocus: !applied })
      applied = true
    }
  }
  return applied
}
