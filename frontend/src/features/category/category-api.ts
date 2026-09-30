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
