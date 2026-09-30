import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth'
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch'
import { fetchBalanceSummary, fetchRevenueSummary } from './dashboard-api'

export function useBalanceSummaryQuery(month: string) {
  const { token } = useAuth()
  const authorizedFetch = useAuthorizedFetch()
  return useQuery({
    queryKey: ['dashboard', 'balance', month],
    queryFn: () => authorizedFetch((t) => fetchBalanceSummary(t, month)),
    enabled: Boolean(token),
  })
}

export function useRevenueSummaryQuery(year: number) {
  const { token } = useAuth()
  const authorizedFetch = useAuthorizedFetch()
  return useQuery({
    queryKey: ['dashboard', 'revenue', year],
    queryFn: () => authorizedFetch((t) => fetchRevenueSummary(t, year)),
    enabled: Boolean(token),
  })
}
