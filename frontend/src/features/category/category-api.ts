import { apiFetch } from '../../lib/http'
import type { TransactionType } from '../transaction/transaction-api'

/** Contract proposed to the backend (module `category`). */
export type Category = {
  id: string
  name: string
  type: TransactionType
  active: boolean
}

/** GET /categories?type=INCOME|EXPENSE -> 200 Category[] */
export function fetchCategories(token: string | null, type: TransactionType) {
  const query = new URLSearchParams({ type })
  return apiFetch<Category[]>(`/categories?${query}`, { token })
}

export const CATEGORY_NAME_MAX_LENGTH = 60

function categoryPath(id: string) {
  return `/categories/${encodeURIComponent(id)}`
}

/**
 * POST /categories { name, type } -> 201 Category (OF10)
 *   400 VALIDATION_ERROR with fieldErrors.name
 *   409 when a category with the same name and type already exists
 */
export function createCategory(
  token: string | null,
  request: { name: string; type: TransactionType },
) {
  return apiFetch<Category>('/categories', {
    token,
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** PUT /categories/{id} { name } -> 200 Category (same errors as creation) */
export function renameCategory(token: string | null, id: string, name: string) {
  return apiFetch<Category>(categoryPath(id), {
    token,
    method: 'PUT',
    body: JSON.stringify({ name }),
  })
}

/**
 * PATCH /categories/{id} { active } -> 200 Category. Categories are never
 * deleted, only inactivated (RN07); an inactive one can be reactivated.
 */
export function setCategoryActive(
  token: string | null,
  id: string,
  active: boolean,
) {
  return apiFetch<Category>(categoryPath(id), {
    token,
    method: 'PATCH',
    body: JSON.stringify({ active }),
  })
}
