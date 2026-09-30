import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HttpError } from '../../lib/http'
import { useAuth } from '../auth/useAuth'
import {
  fetchProfile,
  updateProfile,
  type Profile,
  type UpdateProfileRequest,
} from './profile-api'

export const profileQueryKey = ['profile', 'me'] as const

function useSignOutOnUnauthorized() {
  const { signOut } = useAuth()
  return (error: unknown) => {
    if (error instanceof HttpError && error.status === 401) signOut('expired')
  }
}

export function useProfileQuery() {
  const { token } = useAuth()
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: () => fetchProfile(token),
    enabled: Boolean(token),
  })
}

export function useUpdateProfileMutation() {
  const { token, updateUser } = useAuth()
  const queryClient = useQueryClient()
  const handleUnauthorized = useSignOutOnUnauthorized()

  return useMutation({
    mutationFn: (request: UpdateProfileRequest) =>
      updateProfile(token, request),
    onSuccess: (profile: Profile) => {
      queryClient.setQueryData(profileQueryKey, profile)
      updateUser(profile)
    },
    onError: handleUnauthorized,
  })
}
