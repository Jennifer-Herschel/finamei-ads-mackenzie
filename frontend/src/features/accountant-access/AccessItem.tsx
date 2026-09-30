import { useState } from 'react'
import { FormAlert } from '../../components/FormAlert'
import { getApiErrorMessage } from '../../lib/api-error'
import { HttpError } from '../../lib/http'
import type { AccountantAccess } from './accountant-access-api'
import { useRevokeAccountantAccessMutation } from './useAccountantAccess'

const dateFormatter = new Intl.DateTimeFormat('pt-BR')

const actionButton =
  'rounded-lg px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'

type AccessItemProps = {
  access: AccountantAccess
  onRevoked: (message: string) => void
}

/** One accountant with access, and the action to revoke it (RN11). */
export function AccessItem({ access, onRevoked }: AccessItemProps) {
  const [confirming, setConfirming] = useState(false)
  const mutation = useRevokeAccountantAccessMutation()
  const { name, email } = access.accountant
  const revokedMessage = `O acesso de ${name} foi cortado.`

  const revoke = () =>
    mutation.mutate(access.id, {
      onSuccess: () => onRevoked(revokedMessage),
      onError: (error) => {
        // Already revoked elsewhere: the list is refreshed anyway.
        if (error instanceof HttpError && error.status === 404) {
          onRevoked(revokedMessage)
        }
      },
    })

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{name}</p>
          <p className="break-all text-sm text-slate-600">{email}</p>
          <p className="text-sm text-slate-500">
            Acesso liberado em{' '}
            {dateFormatter.format(new Date(access.grantedAt))}
          </p>
        </div>
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Cortar acesso de ${name}`}
            className={`${actionButton} border border-red-300 text-red-700 hover:bg-red-50`}
          >
            Cortar acesso
          </button>
        )}
      </div>

      {confirming && (
        <div
          role="group"
          aria-label={`Confirmar corte de acesso de ${name}`}
          className="mt-3 space-y-2 rounded-lg bg-red-50 p-3 text-red-900"
        >
          {mutation.isError && (
            <FormAlert tone="error">
              {getApiErrorMessage(mutation.error)}
            </FormAlert>
          )}
          <p className="text-sm">
            {name} deixa de ver seus dados na hora. Você pode liberar o acesso
            de novo quando quiser.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              autoFocus
              onClick={revoke}
              disabled={mutation.isPending}
              className={`${actionButton} bg-red-700 text-white hover:bg-red-800`}
            >
              {mutation.isPending ? 'Cortando…' : 'Sim, cortar acesso'}
            </button>
            <button
              type="button"
              onClick={() => {
                mutation.reset()
                setConfirming(false)
              }}
              disabled={mutation.isPending}
              className={`${actionButton} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
