import { apiFetch } from '../../lib/http'
import type { Page } from '../../lib/page'

/**
 * Contract proposed to the backend (OF05, OF07, RN06, module `transaction`).
 * Monetary values are JSON numbers in BRL; dates are ISO 8601 (YYYY-MM-DD).
 */
export type TransactionType = 'INCOME' | 'EXPENSE'

export type Transaction = {
  id: string
  type: TransactionType
  amount: number
  date: string
  description: string
  category: {
    id: string
    name: string
  }
}

export type CreateTransactionRequest = {
  type: TransactionType
  amount: number
  date: string
  categoryId: string
  description: string
}

export const TRANSACTIONS_PATH = '/transactions'
export const TRANSACTIONS_PAGE_SIZE = 20

/** Filters of the transaction list (OF09). Empty values mean "any". */
export type TransactionFilters = {
  /** Start date, YYYY-MM-DD (inclusive). */
  from: string
  /** End date, YYYY-MM-DD (inclusive). */
  to: string
  type: TransactionType | ''
  categoryId: string
  /** Part of the description, case-insensitive. */
  description: string
}

export const EMPTY_FILTERS: TransactionFilters = {
  from: '',
  to: '',
  type: '',
  categoryId: '',
  description: '',
}

/**
 * GET /transactions?page=N&size=20&sort=date,desc[&from&to&type&categoryId&description]
 *   -> 200 Page<Transaction>, newest first, only the filters that are set.
 */
export function fetchTransactions(
  token: string | null,
  page: number,
  filters: TransactionFilters = EMPTY_FILTERS,
) {
  const query = new URLSearchParams({
    page: String(page),
    size: String(TRANSACTIONS_PAGE_SIZE),
    sort: 'date,desc',
  })
  for (const [key, value] of Object.entries(filters)) {
    const trimmed = value.trim()
    if (trimmed) query.set(key, trimmed)
  }
  return apiFetch<Page<Transaction>>(`${TRANSACTIONS_PATH}?${query}`, {
    token,
  })
}

/**
 * POST /transactions -> 201 Transaction
 *   400 VALIDATION_ERROR with fieldErrors (RN06, inactive category)
 */
export function createTransaction(
  token: string | null,
  request: CreateTransactionRequest,
) {
  return apiFetch<Transaction>(TRANSACTIONS_PATH, {
    token,
    method: 'POST',
    body: JSON.stringify(request),
  })
}

function transactionPath(id: string) {
  return `${TRANSACTIONS_PATH}/${encodeURIComponent(id)}`
}

/**
 * PUT /transactions/{id} -> 200 Transaction (OF06, OF08)
 *   400 VALIDATION_ERROR with fieldErrors (RN06)
 *   403 when it belongs to another user (ONF05)
 *   404 when it was already deleted (UC 4c)
 */
export function updateTransaction(
  token: string | null,
  id: string,
  request: CreateTransactionRequest,
) {
  return apiFetch<Transaction>(transactionPath(id), {
    token,
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

/**
 * DELETE /transactions/{id} -> 204. Logical deletion: the backend keeps the
 * record marked as deleted, with date, time and user (RN08).
 *   404 when it was already deleted (UC 4c)
 */
export function deleteTransaction(token: string | null, id: string) {
  return apiFetch<void>(transactionPath(id), { token, method: 'DELETE' })
}
