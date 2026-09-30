import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth'
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch'
import {
  fetchAccountantAccesses,
  grantAccountantAccess,
  revokeAccountantAccess,
} from './accountant-access-api'

const queryKey = ['accountant-access'] as const

export function useAccountantAccessesQuery() {
  const { token } = useAuth()
  const authorizedFetch = useAuthorizedFetch()
  return useQuery({
    queryKey,
    queryFn: () => authorizedFetch(fetchAccountantAccesses),
    enabled: Boolean(token),
  })
}

export function useGrantAccountantAccessMutation() {
  const authorizedFetch = useAuthorizedFetch()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (accountantEmail: string) =>
      authorizedFetch((t) => grantAccountantAccess(t, accountantEmail)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })
}

export function useRevokeAccountantAccessMutation() {
  const authorizedFetch = useAuthorizedFetch()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      authorizedFetch((t) => revokeAccountantAccess(t, id)),
    // Also after a 404: the access was already revoked elsewhere.
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}
