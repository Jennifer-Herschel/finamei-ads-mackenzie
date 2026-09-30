import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth'
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch'
import {
  createTransaction,
  deleteTransaction,
  EMPTY_FILTERS,
  fetchTransactions,
  updateTransaction,
  type CreateTransactionRequest,
  type TransactionFilters,
} from './transaction-api'

/** A change to a transaction affects the list, the balance and the revenue. */
function useRefreshAfterTransactionChange() {
  const queryClient = useQueryClient()
  return () => {
    for (const queryKey of [['transactions'], ['dashboard'], ['reports']]) {
      void queryClient.invalidateQueries({ queryKey })
    }
  }
}

export function useTransactionsQuery(
  page: number,
  filters: TransactionFilters = EMPTY_FILTERS,
) {
  const { token } = useAuth()
  const authorizedFetch = useAuthorizedFetch()
  return useQuery({
    queryKey: ['transactions', 'list', page, filters],
    queryFn: () => authorizedFetch((t) => fetchTransactions(t, page, filters)),
    enabled: Boolean(token),
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

export function useCreateTransactionMutation() {
  const authorizedFetch = useAuthorizedFetch()
  const refresh = useRefreshAfterTransactionChange()
  return useMutation({
    mutationFn: (request: CreateTransactionRequest) =>
      authorizedFetch((t) => createTransaction(t, request)),
    onSuccess: refresh,
  })
}

export function useUpdateTransactionMutation() {
  const authorizedFetch = useAuthorizedFetch()
  const refresh = useRefreshAfterTransactionChange()
  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string
      request: CreateTransactionRequest
    }) => authorizedFetch((t) => updateTransaction(t, id, request)),
    onSuccess: refresh,
  })
}

export function useDeleteTransactionMutation() {
  const authorizedFetch = useAuthorizedFetch()
  const refresh = useRefreshAfterTransactionChange()
  return useMutation({
    mutationFn: (id: string) =>
      authorizedFetch((t) => deleteTransaction(t, id)),
    // Also refresh after a 404: the transaction was deleted elsewhere (UC 4c).
    onSettled: refresh,
  })
}
