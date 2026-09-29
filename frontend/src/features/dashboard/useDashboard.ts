import { useQuery } from '@tanstack/react-query'
import { HttpError } from '../../lib/http'
import { useAuth } from '../auth/useAuth'
import { fetchBalanceSummary, fetchRevenueSummary } from './dashboard-api'

/** Ends the local session when the backend says the token is no longer valid. */
function useAuthorizedFetch() {
  const { token, signOut } = useAuth()
  return async <T>(request: (token: string | null) => Promise<T>) => {
    try {
      return await request(token)
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) signOut()
      throw error
    }
  }
}

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
