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

/** GET /transactions?page=N&size=20&sort=date,desc -> 200 Page<Transaction>, newest first. */
export function fetchTransactions(token: string | null, page: number) {
  const query = new URLSearchParams({
    page: String(page),
    size: String(TRANSACTIONS_PAGE_SIZE),
    sort: 'date,desc',
  })
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
