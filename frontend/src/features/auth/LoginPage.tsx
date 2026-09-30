import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, type Location } from 'react-router-dom'
import { getApiErrorBody, getApiErrorMessage } from '../../lib/api-error'
import { HttpError } from '../../lib/http'
import { LOGIN_FIELDS, loginSchema, type LoginFormValues } from './login-schema'
import { useAuth } from './useAuth'
import { useLoginMutation } from './useLogin'

const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha inválidos.'
const DEFAULT_REDIRECT = '/painel'

const inputBase =
  'mt-1 block w-full rounded-lg border px-3 py-2 text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:bg-slate-100'

function isLoginField(field: string): field is keyof LoginFormValues {
  return (LOGIN_FIELDS as readonly string[]).includes(field)
}

function getRedirectPath(state: unknown) {
  const from = (state as { from?: Location } | null)?.from
  if (!from || from.pathname === '/login') return DEFAULT_REDIRECT
  return `${from.pathname}${from.search}${from.hash}`
}

export function LoginPage() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const mutation = useLoginMutation()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    resetField,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  if (isAuthenticated) {
    return <Navigate to={getRedirectPath(location.state)} replace />
  }

  const onSubmit = handleSubmit((values) => {
    setFormError(null)

    mutation.mutate(values, {
      onError: (error) => {
        if (error instanceof HttpError && error.status === 401) {
          resetField('password')
          setFormError(
            getApiErrorBody(error)?.message ?? INVALID_CREDENTIALS_MESSAGE,
          )
          return
        }

        let mappedFieldError = false
        for (const [field, message] of Object.entries(
          getApiErrorBody(error)?.fieldErrors ?? {},
        )) {
          if (isLoginField(field)) {
            setError(field, { message }, { shouldFocus: !mappedFieldError })
            mappedFieldError = true
          }
        }

        if (!mappedFieldError) setFormError(getApiErrorMessage(error))
      },
    })
  })

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10 sm:px-6">
      <div className="w-full">
        <header className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            FinaMEI
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Entrar no FinaMEI
          </h1>
          <p className="mt-2 text-slate-600">
            Acesse sua conta para acompanhar as finanças do seu negócio.
          </p>
        </header>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <form noValidate onSubmit={onSubmit} className="space-y-5">
            {formError && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {formError}
              </p>
            )}

            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-slate-800"
              >
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                autoFocus
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={
                  errors.email ? 'login-email-error' : undefined
                }
                className={`${inputBase} ${errors.email ? 'border-red-600' : 'border-slate-300'}`}
                disabled={mutation.isPending}
                {...register('email')}
              />
              {errors.email && (
                <p id="login-email-error" className="mt-1 text-sm text-red-700">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-800"
              >
                Senha
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={
                  errors.password ? 'login-password-error' : undefined
                }
                className={`${inputBase} ${errors.password ? 'border-red-600' : 'border-slate-300'}`}
                disabled={mutation.isPending}
                {...register('password')}
              />
              {errors.password && (
                <p
                  id="login-password-error"
                  className="mt-1 text-sm text-red-700"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
