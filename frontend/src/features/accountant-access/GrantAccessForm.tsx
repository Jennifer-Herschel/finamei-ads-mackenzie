import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { FormAlert } from '../../components/FormAlert'
import { TextField } from '../../components/TextField'
import { getApiErrorMessage } from '../../lib/api-error'
import { applyApiFieldErrors } from '../../lib/form-errors'
import { HttpError } from '../../lib/http'
import {
  GRANT_ACCESS_FIELDS,
  grantAccessSchema,
  type GrantAccessValues,
} from './grant-access-schema'
import { useGrantAccountantAccessMutation } from './useAccountantAccess'

const NOT_FOUND_MESSAGE =
  'Não encontramos um contador com esse e-mail. Peça para ele criar uma conta de contador no FinaMEI e tente de novo.'
const ALREADY_GRANTED_MESSAGE = 'Esse contador já tem acesso aos seus dados.'

type GrantAccessFormProps = {
  onGranted: (message: string) => void
}

/** The MEI gives an accountant read-only access by e-mail (RN11). */
export function GrantAccessForm({ onGranted }: GrantAccessFormProps) {
  const mutation = useGrantAccountantAccessMutation()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<GrantAccessValues>({
    resolver: zodResolver(grantAccessSchema),
    defaultValues: { accountantEmail: '' },
  })

  const onSubmit = handleSubmit(({ accountantEmail }) => {
    setFormError(null)
    mutation.mutate(accountantEmail, {
      onSuccess: (access) => {
        reset({ accountantEmail: '' })
        onGranted(
          `${access.accountant.name} agora pode consultar seus relatórios e seu faturamento.`,
        )
      },
      onError: (error) => {
        const status = error instanceof HttpError ? error.status : null
        if (status === 404 || status === 409) {
          setError(
            'accountantEmail',
            {
              message:
                status === 404 ? NOT_FOUND_MESSAGE : ALREADY_GRANTED_MESSAGE,
            },
            { shouldFocus: true },
          )
        } else if (!applyApiFieldErrors(error, GRANT_ACCESS_FIELDS, setError)) {
          setFormError(getApiErrorMessage(error))
        }
      },
    })
  })

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-3">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <TextField
          label="E-mail do contador"
          type="email"
          autoComplete="off"
          hint="O contador precisa ter uma conta de contador no FinaMEI."
          error={errors.accountantEmail?.message}
          className="flex-1"
          {...register('accountantEmail')}
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6"
        >
          {mutation.isPending ? 'Liberando…' : 'Liberar acesso'}
        </button>
      </div>
    </form>
  )
}
