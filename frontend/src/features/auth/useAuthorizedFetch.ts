import { HttpError } from '../../lib/http'
import { useAuth } from './useAuth'

/** Ends the local session when the backend says the token is no longer valid. */
export function useAuthorizedFetch() {
  const { token, signOut } = useAuth()
  return async <T>(request: (token: string | null) => Promise<T>) => {
    try {
      return await request(token)
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) signOut('expired')
      throw error
    }
  }
}
