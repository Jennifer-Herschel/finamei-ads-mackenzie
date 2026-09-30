import { z } from 'zod'

export const grantAccessSchema = z.object({
  accountantEmail: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail do contador.')
    .pipe(z.email('Informe um e-mail válido.')),
})

export type GrantAccessValues = z.infer<typeof grantAccessSchema>

export const GRANT_ACCESS_FIELDS = ['accountantEmail'] as const
