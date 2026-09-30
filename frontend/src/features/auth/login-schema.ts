import { z } from 'zod'

/** Mirrors the LoginRequest validation rules in the backend. */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail.')
    .pipe(z.email('Informe um e-mail válido.')),
  password: z.string().min(1, 'Informe a senha.'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const LOGIN_FIELDS = ['email', 'password'] as const
