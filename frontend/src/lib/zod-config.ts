import { z } from 'zod'

/**
 * Fallback messages for validation rules without a custom message, in plain
 * Portuguese and without technical terms (ONF02). Schemas should still give
 * their own messages; this only covers what was left out.
 */
export function configureZod() {
  z.config(z.locales.ptBR())
  z.config({
    customError: (issue) => {
      if (issue.code === 'invalid_type') {
        if (issue.input === undefined || issue.input === null) {
          return 'Preencha este campo.'
        }
        if (issue.expected === 'number') return 'Informe um número.'
        if (issue.expected === 'date') return 'Informe uma data válida.'
        return 'Valor inválido. Confira o que foi digitado.'
      }
      if (issue.code === 'too_small') {
        const minimum = Number(issue.minimum)
        if (issue.origin === 'string') {
          return minimum <= 1
            ? 'Preencha este campo.'
            : `Use pelo menos ${minimum} caracteres.`
        }
        if (issue.origin === 'number') {
          return issue.inclusive
            ? `Informe um valor a partir de ${minimum}.`
            : `Informe um valor maior que ${minimum}.`
        }
      }
      if (issue.code === 'too_big') {
        const maximum = Number(issue.maximum)
        if (issue.origin === 'string') {
          return `Use no máximo ${maximum} caracteres.`
        }
        if (issue.origin === 'number') {
          return issue.inclusive
            ? `Informe um valor até ${maximum}.`
            : `Informe um valor menor que ${maximum}.`
        }
      }
      if (issue.code === 'invalid_format' && issue.format === 'email') {
        return 'Informe um e-mail válido.'
      }
      // Anything else falls back to the pt-BR locale.
      return undefined
    },
  })
}
