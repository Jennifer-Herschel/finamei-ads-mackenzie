import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth'
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch'
import type { TransactionType } from '../transaction/transaction-api'
import { fetchCategories } from './category-api'

export function useCategoriesQuery(type: TransactionType) {
  const { token } = useAuth()
  const authorizedFetch = useAuthorizedFetch()
  return useQuery({
    queryKey: ['categories', type],
    queryFn: () => authorizedFetch((t) => fetchCategories(t, type)),
    enabled: Boolean(token),
    // An inactive category cannot be used in new transactions (RN07).
    select: (categories) => categories.filter((category) => category.active),
    staleTime: 5 * 60_000,
  })
}
