import { z } from 'zod'

/** Espelha as regras do RegisterUserRequest no backend (nome ≤ 120, e-mail ≤ 180). */
export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome.')
    .max(120, 'O nome deve ter no máximo 120 caracteres.'),
  email: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail.')
    .max(180, 'O e-mail deve ter no máximo 180 caracteres.')
    .pipe(z.email('Informe um e-mail válido.')),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

export const PROFILE_FIELDS = ['name', 'email'] as const
