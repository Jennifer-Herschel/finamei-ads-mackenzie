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

export type AuthContextValue = {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  signIn: (session: AuthSession) => void
  signOut: () => void
  /** Atualiza os dados do usuário na sessão local (ex.: após editar o perfil). */
  updateUser: (user: AuthUser) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const AUTH_STORAGE_KEY = 'finamei.session'
