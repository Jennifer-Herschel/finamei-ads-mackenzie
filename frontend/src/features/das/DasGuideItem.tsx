import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { FormAlert } from '../../components/FormAlert'
import { TextField } from '../../components/TextField'
import { getApiErrorBody, getApiErrorMessage } from '../../lib/api-error'
import { applyApiFieldErrors } from '../../lib/form-errors'
import { formatCurrency, formatDate, formatMonthYear } from '../../lib/format'
import { HttpError } from '../../lib/http'
import type { DasGuide, DasStatus } from './das-api'
import {
  createDasPaymentSchema,
  DAS_PAYMENT_FIELDS,
  type DasPaymentFormValues,
} from './das-schema'
import {
  usePayDasMutation,
  useRefreshDasGuides,
  useUndoDasPaymentMutation,
} from './useDas'

const ALREADY_PAID_MESSAGE = 'Esta guia já estava registrada como paga.'
const ALREADY_PENDING_MESSAGE = 'Esta guia já estava pendente.'

const statusStyle: Record<DasStatus, string> = {
  PAID: 'bg-emerald-50 text-emerald-800',
  PENDING: 'bg-slate-100 text-slate-700',
  OVERDUE: 'bg-red-50 text-red-800',
}

const buttonBase =
  'rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'

const secondaryButton = `${buttonBase} border border-slate-300 text-slate-800 hover:bg-slate-50`

type Mode = 'idle' | 'paying' | 'undoing'

function describeStatus(guide: DasGuide) {
  if (guide.status === 'PAID') {
    return guide.paidAt ? `Paga em ${formatDate(guide.paidAt)}` : 'Paga'
  }
  return guide.status === 'OVERDUE' ? 'Vencida' : 'Pendente'
}

/** "2026-01" -> "janeiro de 2026" */
function competenceLabel(competence: string) {
  const [year, month] = competence.split('-').map(Number)
  return formatMonthYear(new Date(year, month - 1, 1))
}

type DasGuideItemProps = {
  guide: DasGuide
  year: number
  /** Reference date (YYYY-MM-DD): the default payment date and the latest allowed. */
  todayIso: string
}

/** One monthly DAS guide, with the actions to register or undo its payment (OF14). */
export function DasGuideItem({ guide, year, todayIso }: DasGuideItemProps) {
  const schema = useMemo(() => createDasPaymentSchema(todayIso), [todayIso])
  const payMutation = usePayDasMutation(year)
  const undoMutation = useUndoDasPaymentMutation(year)
  const refreshGuides = useRefreshDasGuides(year)
  const [mode, setMode] = useState<Mode>('idle')
  const [earlyDateToConfirm, setEarlyDateToConfirm] = useState<string | null>(
    null,
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const label = competenceLabel(guide.competence)
  const title = label[0].toUpperCase() + label.slice(1)
  const fieldId = `das-paid-at-${guide.id}`
  const competenceStart = `${guide.competence}-01`
  // The DAS of a month is only calculated after the month ends.
  const isPayable = guide.competence < todayIso.slice(0, 7)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DasPaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { paidAt: todayIso },
  })

  const startAction = (next: Mode) => {
    setFormError(null)
    setSuccessMessage(null)
    setEarlyDateToConfirm(null)
    setMode(next)
  }

  const handleConflict = (message: string) => {
    setMode('idle')
    setFormError(message)
    void refreshGuides()
  }

  const onSubmit = handleSubmit((values) => {
    setFormError(null)

    // A date before the month of the guide is unusual (UC 4b): ask again.
    if (
      values.paidAt < competenceStart &&
      earlyDateToConfirm !== values.paidAt
    ) {
      setEarlyDateToConfirm(values.paidAt)
      return
    }

    payMutation.mutate(
      { id: guide.id, request: values },
      {
        onSuccess: () => {
          setMode('idle')
          setSuccessMessage(`Pagamento de ${label} registrado.`)
        },
        onError: (error) => {
          if (error instanceof HttpError && error.status === 409) {
            handleConflict(
              getApiErrorBody(error)?.message ?? ALREADY_PAID_MESSAGE,
            )
            return
          }
          if (!applyApiFieldErrors(error, DAS_PAYMENT_FIELDS, setError)) {
            setFormError(getApiErrorMessage(error))
          }
        },
      },
    )
  })

  const confirmUndo = () => {
    setFormError(null)
    undoMutation.mutate(guide.id, {
      onSuccess: () => {
        setMode('idle')
        setSuccessMessage(
          `Pagamento de ${label} desfeito. A guia voltou para pendente.`,
        )
      },
      onError: (error) => {
        if (error instanceof HttpError && error.status === 409) {
          handleConflict(
            getApiErrorBody(error)?.message ?? ALREADY_PENDING_MESSAGE,
          )
          return
        }
        setFormError(getApiErrorMessage(error))
      },
    })
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600">
            Vencimento: {formatDate(guide.dueDate)} ·{' '}
            {formatCurrency(guide.amount)}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle[guide.status]}`}
        >
          {describeStatus(guide)}
        </span>
      </div>

      {(formError || successMessage) && mode === 'idle' && (
        <div className="mt-3">
          {formError ? (
            <FormAlert tone="error">{formError}</FormAlert>
          ) : (
            <FormAlert tone="success">{successMessage}</FormAlert>
          )}
        </div>
      )}

      {mode === 'idle' && guide.status !== 'PAID' && isPayable && (
        <button
          type="button"
          aria-label={`Marcar ${label} como paga`}
          onClick={() => startAction('paying')}
          className={`${buttonBase} mt-3 border border-emerald-700 text-emerald-800 hover:bg-emerald-50`}
        >
          Marcar como paga
        </button>
      )}

      {guide.status !== 'PAID' && !isPayable && (
        <p className="mt-3 text-sm text-slate-500">
          O pagamento fica disponível depois que o mês terminar.
        </p>
      )}

      {mode === 'idle' && guide.status === 'PAID' && (
        <button
          type="button"
          aria-label={`Desfazer pagamento de ${label}`}
          onClick={() => startAction('undoing')}
          className={`${secondaryButton} mt-3`}
        >
          Desfazer pagamento
        </button>
      )}

      {mode === 'undoing' && (
        <div
          role="group"
          aria-label={`Desfazer pagamento de ${label}`}
          className="mt-3 space-y-3"
        >
          {formError && <FormAlert tone="error">{formError}</FormAlert>}
          <p className="text-sm text-slate-700">
            Voltar a guia de {label} para pendente? Use esta opção só se o
            pagamento foi registrado por engano.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setMode('idle')}
              disabled={undoMutation.isPending}
              className={secondaryButton}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmUndo}
              disabled={undoMutation.isPending}
              className={`${buttonBase} bg-red-700 text-white hover:bg-red-800`}
            >
              {undoMutation.isPending ? 'Desfazendo…' : 'Sim, desfazer'}
            </button>
          </div>
        </div>
      )}

      {mode === 'paying' && (
        <form
          noValidate
          onSubmit={onSubmit}
          aria-label={`Pagamento de ${label}`}
          className="mt-3 space-y-3"
        >
          {formError && <FormAlert tone="error">{formError}</FormAlert>}
          <TextField
            id={fieldId}
            label="Data do pagamento"
            type="date"
            max={todayIso}
            error={errors.paidAt?.message}
            disabled={payMutation.isPending}
            {...register('paidAt', {
              onChange: () => setEarlyDateToConfirm(null),
            })}
          />
          {earlyDateToConfirm && (
            <p
              role="alert"
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              A data {formatDate(earlyDateToConfirm)} é anterior ao mês da guia
              ({label}). Confira a data ou confirme para registrar mesmo assim.
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setMode('idle')
                setFormError(null)
              }}
              disabled={payMutation.isPending}
              className={secondaryButton}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={payMutation.isPending}
              className={`${buttonBase} bg-emerald-700 text-white hover:bg-emerald-800`}
            >
              {payMutation.isPending
                ? 'Registrando…'
                : earlyDateToConfirm
                  ? 'Confirmar mesmo assim'
                  : 'Confirmar pagamento'}
            </button>
          </div>
        </form>
      )}
    </li>
  )
}
