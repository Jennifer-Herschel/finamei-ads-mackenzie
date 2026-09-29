import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  AUTH_STORAGE_KEY,
  AuthContext,
  type AuthContextValue,
  type AuthSession,
  type AuthUser,
} from './auth-context'

const MAX_TIMEOUT_MS = 2_147_483_647

function isExpired(session: AuthSession) {
  return session.expiresAt !== undefined && session.expiresAt <= Date.now()
}

function readStoredSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (typeof parsed?.token !== 'string' || isExpired(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

function writeStoredSession(session: AuthSession | null) {
  try {
    if (session) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
    } else {
      sessionStorage.removeItem(AUTH_STORAGE_KEY)
    }
  } catch {
    // Armazenamento indisponível (ex.: modo privado): a sessão fica só em memória.
  }
}

type AuthProviderProps = {
  children: ReactNode
  /** Sessão inicial, útil em testes. Por padrão lê do sessionStorage. */
  initialSession?: AuthSession | null
}

export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    initialSession !== undefined ? initialSession : readStoredSession(),
  )

  const persist = useCallback((next: AuthSession | null) => {
    writeStoredSession(next)
    setSession(next)
  }, [])

  const signIn = useCallback((next: AuthSession) => persist(next), [persist])
  const signOut = useCallback(() => persist(null), [persist])

  const updateUser = useCallback((user: AuthUser) => {
    setSession((current) => {
      if (!current) return current
      const next = { ...current, user }
      writeStoredSession(next)
      return next
    })
  }, [])

  // Drop the session as soon as the token expires (ONF04), so protected
  // routes send the user back to the login screen.
  useEffect(() => {
    if (session?.expiresAt === undefined) return
    const delay = session.expiresAt - Date.now()
    // setTimeout overflows above ~24.8 days and would fire immediately.
    if (delay > MAX_TIMEOUT_MS) return
    const timeout = setTimeout(signOut, delay)
    return () => clearTimeout(timeout)
  }, [session?.expiresAt, signOut])

  const value = useMemo<AuthContextValue>(
    () => ({
      token: session?.token ?? null,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.token),
      signIn,
      signOut,
      updateUser,
    }),
    [session, signIn, signOut, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
