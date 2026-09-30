import { useMutation } from '@tanstack/react-query'
import { login, type LoginRequest } from './login-api'
import { useAuth } from './useAuth'

export function useLoginMutation() {
  const { signIn } = useAuth()

  return useMutation({
    mutationFn: (request: LoginRequest) => login(request),
    onSuccess: (response) => {
      signIn({
        token: response.token,
        // The login response carries only the token; the profile is loaded
        // by the screens that need it (GET /users/me).
        user: null,
        expiresAt: Date.now() + response.expiresInSeconds * 1000,
      })
    },
  })
}
