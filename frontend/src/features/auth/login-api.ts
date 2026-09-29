import { apiFetch } from '../../lib/http'

/** Mirrors LoginRequest/LoginResponse from the backend (POST /auth/login). */
export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  token: string
  tokenType: string
  expiresInSeconds: number
}

export const LOGIN_PATH = '/auth/login'

export function login(request: LoginRequest) {
  return apiFetch<LoginResponse>(LOGIN_PATH, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
