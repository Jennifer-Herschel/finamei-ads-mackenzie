import { HttpError } from './http'

/** Formato de erro padronizado pelo backend (context.MD, seção 7). */
export type ApiErrorBody = {
  code: string
  message: string
  fieldErrors?: Record<string, string>
  timestamp?: string
}

const GENERIC_ERROR_MESSAGE =
  'Não foi possível concluir a operação. Tente novamente em instantes.'

export function getApiErrorBody(error: unknown): ApiErrorBody | null {
  if (!(error instanceof HttpError)) return null
  const body = error.body
  if (
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    'message' in body
  ) {
    return body as ApiErrorBody
  }
  return null
}

/**
 * Mensagem amigável para exibir ao usuário. Nunca repassa detalhes técnicos
 * (status, stack, texto interno) quando o backend não enviou uma mensagem.
 */
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof HttpError && error.status === 401) {
    return 'Sua sessão expirou. Entre novamente para continuar.'
  }
  const body = getApiErrorBody(error)
  if (body?.message) return body.message
  if (error instanceof TypeError) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.'
  }
  return GENERIC_ERROR_MESSAGE
}
