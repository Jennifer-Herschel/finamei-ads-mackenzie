import { z } from 'zod'

/**
 * Payment date of a DAS guide. It cannot be in the future (UC 4a); a date
 * before the reference month is allowed but needs confirmation (UC 4b), which
 * the form handles with `isBeforeReferenceMonth`.
 */
export function createDasPaymentSchema(todayIso: string) {
  return z.object({
    paidAt: z
      .string()
      .min(1, 'Informe a data do pagamento.')
      .refine(
        (date) => date <= todayIso,
        'A data do pagamento não pode ser futura.',
      ),
  })
}

export type DasPaymentFormValues = z.infer<
  ReturnType<typeof createDasPaymentSchema>
>

export const DAS_PAYMENT_FIELDS = ['paidAt'] as const

/** "2026-07-31" is before the reference month "2026-08". */
export function isBeforeReferenceMonth(paidAt: string, referenceMonth: string) {
  return paidAt < `${referenceMonth}-01`
}
