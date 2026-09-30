import { createContext } from 'react'

export type Role = 'MEI' | 'ACCOUNTANT' | 'ADMIN'

/** Espelha o UserResponse do backend. */
export type AuthUser = {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: string
}

export type AuthSession = {
  token: string
  user: AuthUser | null
  /** Epoch millis when the token expires; the session is dropped after it. */
  expiresAt?: number
}

export type SignOutReason = 'expired'

export type AuthContextValue = {
  token: string | null
  user: AuthUser | null
  /** Role of the signed-in user, from the profile or from the token. */
  role: Role | null
  isAuthenticated: boolean
  signIn: (session: AuthSession) => void
  /** 'expired' when the session ended on its own (token expired or rejected). */
  signOut: (reason?: SignOutReason) => void
  /** True after the session expired, until the next sign in. */
  sessionExpired: boolean
  /** Atualiza os dados do usuário na sessão local (ex.: após editar o perfil). */
  updateUser: (user: AuthUser) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const AUTH_STORAGE_KEY = 'finamei.session'
