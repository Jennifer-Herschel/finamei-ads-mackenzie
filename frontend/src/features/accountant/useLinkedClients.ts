import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth'
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch'
import { fetchLinkedClients } from './accountant-api'

export const linkedClientsQueryKey = ['accountant', 'clients'] as const

export function useLinkedClientsQuery() {
  const { token } = useAuth()
  const authorizedFetch = useAuthorizedFetch()
  return useQuery({
    queryKey: linkedClientsQueryKey,
    queryFn: () => authorizedFetch(fetchLinkedClients),
    enabled: Boolean(token),
  })
}
