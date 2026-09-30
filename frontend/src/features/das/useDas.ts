import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth'
import { useAuthorizedFetch } from '../auth/useAuthorizedFetch'
import { fetchDasGuides, markDasAsPaid, undoDasPayment } from './das-api'

export function useDasGuidesQuery(year: number) {
  const { token } = useAuth()
  const authorizedFetch = useAuthorizedFetch()
  return useQuery({
    queryKey: ['das', year],
    queryFn: () => authorizedFetch((t) => fetchDasGuides(t, year)),
    enabled: Boolean(token),
  })
}

function useRefreshAfterDasChange() {
  const queryClient = useQueryClient()
  // The list and the pending indicator elsewhere must reflect the change (UC 5).
  return () => {
    for (const queryKey of [['das'], ['dashboard']]) {
      void queryClient.invalidateQueries({ queryKey })
    }
  }
}

export function useMarkDasAsPaidMutation() {
  const authorizedFetch = useAuthorizedFetch()
  const refresh = useRefreshAfterDasChange()
  return useMutation({
    mutationFn: ({ id, paidAt }: { id: string; paidAt: string }) =>
      authorizedFetch((t) => markDasAsPaid(t, id, paidAt)),
    onSuccess: refresh,
  })
}

export function useUndoDasPaymentMutation() {
  const authorizedFetch = useAuthorizedFetch()
  const refresh = useRefreshAfterDasChange()
  return useMutation({
    mutationFn: (id: string) => authorizedFetch((t) => undoDasPayment(t, id)),
    onSuccess: refresh,
  })
}
