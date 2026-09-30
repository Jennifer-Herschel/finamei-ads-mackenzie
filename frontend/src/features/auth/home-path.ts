import type { Role } from './auth-context'

/** First screen of each role after signing in. */
export function getHomePath(role: Role | null) {
  return role === 'ACCOUNTANT' ? '/clientes' : '/painel'
}
