import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { Role } from './auth-context'
import { getHomePath } from './home-path'
import { useAuth } from './useAuth'

export function HomeRedirect() {
  const { role } = useAuth()
  return <Navigate to={getHomePath(role)} replace />
}

type RequireRoleProps = {
  roles: readonly Role[]
  children: ReactNode
}

/**
 * Keeps each role on its own screens (e.g. the accountant only reads client
 * data). The backend still enforces the permissions (ONF05).
 */
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { role } = useAuth()
  // Tokens without a known role get the MEI experience.
  if (!roles.includes(role ?? 'MEI')) return <HomeRedirect />
  return children
}
