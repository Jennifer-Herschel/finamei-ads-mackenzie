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
  fetchTransactions,
  type CreateTransactionRequest,
} from './transaction-api'

export function useTransactionsQuery(page: number) {
  const { token } = useAuth()
  const authorizedFetch = useAuthorizedFetch()
  return useQuery({
    queryKey: ['transactions', 'list', page],
    queryFn: () => authorizedFetch((t) => fetchTransactions(t, page)),
    enabled: Boolean(token),
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

export function useCreateTransactionMutation() {
  const authorizedFetch = useAuthorizedFetch()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateTransactionRequest) =>
      authorizedFetch((t) => createTransaction(t, request)),
    onSuccess: () => {
      // A new transaction changes the list, the balance and the revenue.
      for (const queryKey of [['transactions'], ['dashboard'], ['reports']]) {
        void queryClient.invalidateQueries({ queryKey })
      }
    },
  })
}
