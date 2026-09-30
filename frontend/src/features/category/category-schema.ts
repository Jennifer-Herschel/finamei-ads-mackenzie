import { z } from 'zod'
import { CATEGORY_NAME_MAX_LENGTH } from './category-api'

export const categoryNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome da categoria.')
    .max(
      CATEGORY_NAME_MAX_LENGTH,
      `O nome deve ter no máximo ${CATEGORY_NAME_MAX_LENGTH} caracteres.`,
    ),
})

export type CategoryNameValues = z.infer<typeof categoryNameSchema>

export const CATEGORY_FIELDS = ['name'] as const

export const DUPLICATE_NAME_MESSAGE =
  'Já existe uma categoria com esse nome. Escolha outro nome.'
