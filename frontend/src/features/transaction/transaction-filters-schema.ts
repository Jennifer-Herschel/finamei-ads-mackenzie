import { z } from 'zod'

/** Filters of the transaction list (OF09); every field is optional. */
export const transactionFiltersSchema = z
  .object({
    from: z.string(),
    to: z.string(),
    type: z.enum(['', 'INCOME', 'EXPENSE']),
    categoryId: z.string(),
    description: z.string().trim(),
  })
  .refine(
    (filters) => !filters.from || !filters.to || filters.from <= filters.to,
    {
      path: ['to'],
      message: 'A data final deve ser igual ou posterior à data inicial.',
    },
  )

export type TransactionFiltersValues = z.infer<typeof transactionFiltersSchema>
