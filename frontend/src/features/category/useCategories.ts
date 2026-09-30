import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth'
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch'
import type { TransactionType } from '../transaction/transaction-api'
import {
  createCategory,
  fetchCategories,
  renameCategory,
  setCategoryActive,
} from './category-api'

const STALE_TIME = 5 * 60_000

function useCategoriesBaseQuery(type: TransactionType) {
  const { token } = useAuth()
  const authorizedFetch = useAuthorizedFetch()
  return {
    queryKey: ['categories', type],
    queryFn: () => authorizedFetch((t) => fetchCategories(t, type)),
    enabled: Boolean(token),
    staleTime: STALE_TIME,
  }
}

/** Categories that can be used in new transactions. */
export function useCategoriesQuery(type: TransactionType) {
  return useQuery({
    ...useCategoriesBaseQuery(type),
    // An inactive category cannot be used in new transactions (RN07).
    select: (categories) => categories.filter((category) => category.active),
  })
}

/** Every category of the type, active or not, for the management screen (OF10). */
export function useAllCategoriesQuery(type: TransactionType) {
  return useQuery(useCategoriesBaseQuery(type))
}

function useRefreshCategories() {
  const queryClient = useQueryClient()
  // Renaming also changes how existing transactions show their category.
  return () => {
    for (const queryKey of [['categories'], ['transactions']]) {
      void queryClient.invalidateQueries({ queryKey })
    }
  }
}

export function useCreateCategoryMutation() {
  const authorizedFetch = useAuthorizedFetch()
  const refresh = useRefreshCategories()
  return useMutation({
    mutationFn: (request: { name: string; type: TransactionType }) =>
      authorizedFetch((t) => createCategory(t, request)),
    onSuccess: refresh,
  })
}

export function useRenameCategoryMutation() {
  const authorizedFetch = useAuthorizedFetch()
  const refresh = useRefreshCategories()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      authorizedFetch((t) => renameCategory(t, id, name)),
    onSuccess: refresh,
  })
}

export function useSetCategoryActiveMutation() {
  const authorizedFetch = useAuthorizedFetch()
  const refresh = useRefreshCategories()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      authorizedFetch((t) => setCategoryActive(t, id, active)),
    onSuccess: refresh,
  })
}
