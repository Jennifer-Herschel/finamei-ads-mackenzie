import { z } from 'zod'

export const DESCRIPTION_MAX_LENGTH = 120

// "1500", "1500,5" or "1.500,50": comma for cents, optional dots for thousands.
const AMOUNT_PATTERN = /^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/

/** "1.500,50" -> 1500.5 */
export function parseAmount(text: string) {
  return Number(text.replace(/\./g, '').replace(',', '.'))
}

/**
 * Mirrors RN06: positive amount with at most two decimal places, date not in
 * the future and description up to 120 characters. The backend stays the
 * authority; `todayIso` is the reference date (YYYY-MM-DD).
 */
export function createTransactionSchema(todayIso: string) {
  return z.object({
    type: z.enum(['INCOME', 'EXPENSE']),
    amount: z
      .string()
      .trim()
      .min(1, 'Informe o valor.')
      .regex(
        AMOUNT_PATTERN,
        'Informe o valor em reais, com até duas casas decimais (ex.: 1.250,50).',
      )
      .transform(parseAmount)
      .refine((amount) => amount > 0, 'O valor deve ser maior que zero.'),
    date: z
      .string()
      .min(1, 'Informe a data.')
      .refine((date) => date <= todayIso, 'A data não pode ser futura.'),
    categoryId: z.string().min(1, 'Selecione uma categoria.'),
    description: z
      .string()
      .trim()
      .min(1, 'Informe a descrição.')
      .max(
        DESCRIPTION_MAX_LENGTH,
        `A descrição deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`,
      ),
  })
}

type TransactionSchema = ReturnType<typeof createTransactionSchema>

export type TransactionFormValues = z.input<TransactionSchema>
export type TransactionFormOutput = z.output<TransactionSchema>

export const TRANSACTION_FIELDS = [
  'type',
  'amount',
  'date',
  'categoryId',
  'description',
] as const
