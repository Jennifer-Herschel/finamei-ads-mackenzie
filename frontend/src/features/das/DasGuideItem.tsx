import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { FormAlert } from '../../components/FormAlert'
import { TextField } from '../../components/TextField'
import { getApiErrorMessage } from '../../lib/api-error'
import { formatCurrency, formatDate } from '../../lib/format'
import { applyApiFieldErrors } from '../../lib/form-errors'
import type { DasGuide, DasStatus } from './das-api'
import {
  createDasPaymentSchema,
  DAS_PAYMENT_FIELDS,
  isBeforeReferenceMonth,
  type DasPaymentFormValues,
} from './das-payment-schema'
import { formatMonthName } from './das-months'
import { useMarkDasAsPaidMutation, useUndoDasPaymentMutation } from './useDas'

const statusLabel: Record<DasStatus, string> = {
  PAID: 'Pago',
  PENDING: 'Pendente',
  OVERDUE: 'Em atraso',
}

const statusStyle: Record<DasStatus, string> = {
  PAID: 'bg-emerald-50 text-emerald-800',
  PENDING: 'bg-slate-100 text-slate-700',
  OVERDUE: 'bg-red-50 text-red-800',
}

const buttonBase =
  'rounded-lg px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'
const primaryButton = `${buttonBase} bg-emerald-700 text-white hover:bg-emerald-800`
const secondaryButton = `${buttonBase} border border-slate-300 text-slate-800 hover:bg-slate-50`

type PaymentFormProps = {
  guide: DasGuide
  monthName: string
  todayIso: string
  onDone: (message: string) => void
  onCancel: () => void
}

/** Registers the payment date of one guide (UC steps 3 and 4). */
function PaymentForm({
  guide,
  monthName,
  todayIso,
  onDone,
  onCancel,
}: PaymentFormProps) {
  const schema = useMemo(() => createDasPaymentSchema(todayIso), [todayIso])
  const mutation = useMarkDasAsPaidMutation()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<DasPaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { paidAt: todayIso },
  })
  const paidAt = useWatch({ control, name: 'paidAt' })
  // Date the user was warned about for being before the reference month; a
  // second submit with the same date confirms it (UC 4b).
  const [warnedDate, setWarnedDate] = useState<string | null>(null)
  const showEarlyWarning = warnedDate !== null && warnedDate === paidAt

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    if (
      isBeforeReferenceMonth(values.paidAt, guide.referenceMonth) &&
      warnedDate !== values.paidAt
    ) {
      setWarnedDate(values.paidAt)
      return
    }

    mutation.mutate(
      { id: guide.id, paidAt: values.paidAt },
      {
        onSuccess: () => onDone(`Pagamento do DAS de ${monthName} registrado.`),
        onError: (error) => {
          if (!applyApiFieldErrors(error, DAS_PAYMENT_FIELDS, setError)) {
            setFormError(getApiErrorMessage(error))
          }
        },
      },
    )
  })

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-label={`Registrar pagamento do DAS de ${monthName}`}
      className="mt-3 w-full space-y-3 rounded-lg bg-slate-50 p-3"
    >
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <TextField
        label="Data do pagamento"
        type="date"
        max={todayIso}
        autoFocus
        error={errors.paidAt?.message}
        disabled={mutation.isPending}
        className="sm:max-w-xs"
        {...register('paidAt')}
      />
      {showEarlyWarning && (
        <p
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          Essa data é anterior a {monthName}, o mês desta guia. Confira se está
          certa antes de confirmar.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className={primaryButton}
        >
          {mutation.isPending
            ? 'Salvando…'
            : showEarlyWarning
              ? 'Confirmar mesmo assim'
              : 'Confirmar pagamento'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={mutation.isPending}
          className={secondaryButton}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

type UndoConfirmationProps = {
  guide: DasGuide
  monthName: string
  onDone: (message: string) => void
  onCancel: () => void
}

/** Asks before moving a paid guide back to pending (UC 3a). */
function UndoConfirmation({
  guide,
  monthName,
  onDone,
  onCancel,
}: UndoConfirmationProps) {
  const mutation = useUndoDasPaymentMutation()

  return (
    <div
      role="group"
      aria-label={`Desfazer pagamento do DAS de ${monthName}`}
      className="mt-3 w-full space-y-3 rounded-lg bg-amber-50 p-3 text-amber-900"
    >
      {mutation.isError && (
        <FormAlert tone="error">{getApiErrorMessage(mutation.error)}</FormAlert>
      )}
      <p className="text-sm">
        Voltar o DAS de {monthName} para pendente? Use isso só se o pagamento
        foi marcado por engano.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          autoFocus
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate(guide.id, {
              onSuccess: () =>
                onDone(`O DAS de ${monthName} voltou para pendente.`),
            })
          }
          className={`${buttonBase} bg-amber-700 text-white hover:bg-amber-800`}
        >
          {mutation.isPending ? 'Desfazendo…' : 'Sim, desfazer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={mutation.isPending}
          className={secondaryButton}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

type DasGuideItemProps = {
  guide: DasGuide
  todayIso: string
}

/** One month of the DAS control list (OF14, RN05). */
export function DasGuideItem({ guide, todayIso }: DasGuideItemProps) {
  const [mode, setMode] = useState<'idle' | 'paying' | 'undoing'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const monthName = formatMonthName(guide.referenceMonth)
  // The guide can only be paid once its month is over.
  const currentMonth = todayIso.slice(0, 7)
  const canPay = guide.referenceMonth < currentMonth

  const finish = (text: string) => {
    setMode('idle')
    setMessage(text)
  }

  return (
    <li
      className={`border-b border-slate-200 py-3 last:border-b-0 ${
        guide.status === 'OVERDUE' ? 'bg-red-50/40' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="font-semibold capitalize text-slate-900">{monthName}</p>
          <p className="text-sm text-slate-600">
            {formatCurrency(guide.amount)} · vence em{' '}
            {formatDate(guide.dueDate)}
          </p>
          {guide.paidAt && (
            <p className="text-sm text-slate-600">
              Pago em {formatDate(guide.paidAt)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle[guide.status]}`}
          >
            {statusLabel[guide.status]}
          </span>
          {mode === 'idle' && guide.status !== 'PAID' && canPay && (
            <button
              type="button"
              onClick={() => {
                setMessage(null)
                setMode('paying')
              }}
              aria-label={`Marcar DAS de ${monthName} como pago`}
              className={`${buttonBase} border border-emerald-700 text-emerald-800 hover:bg-emerald-50`}
            >
              Marcar como pago
            </button>
          )}
          {mode === 'idle' && guide.status === 'PAID' && (
            <button
              type="button"
              onClick={() => {
                setMessage(null)
                setMode('undoing')
              }}
              aria-label={`Desfazer pagamento do DAS de ${monthName}`}
              className={`${buttonBase} text-slate-700 underline-offset-2 hover:underline`}
            >
              Desfazer
            </button>
          )}
          {guide.status !== 'PAID' && !canPay && (
            <span className="text-sm text-slate-500">
              {guide.referenceMonth === currentMonth
                ? 'Mês em andamento'
                : 'Mês futuro'}
            </span>
          )}
        </div>
      </div>

      {mode === 'paying' && (
        <PaymentForm
          guide={guide}
          monthName={monthName}
          todayIso={todayIso}
          onDone={finish}
          onCancel={() => setMode('idle')}
        />
      )}
      {mode === 'undoing' && (
        <UndoConfirmation
          guide={guide}
          monthName={monthName}
          onDone={finish}
          onCancel={() => setMode('idle')}
        />
      )}
      {message && (
        <p role="status" className="mt-2 text-sm text-emerald-800">
          {message}
        </p>
      )}
    </li>
  )
}
