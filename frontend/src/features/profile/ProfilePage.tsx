import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { getApiErrorBody, getApiErrorMessage } from '../../lib/api-error'
import { HttpError } from '../../lib/http'
import { useAuth } from '../auth/useAuth'
import {
  PROFILE_FIELDS,
  profileSchema,
  type ProfileFormValues,
} from './profile-schema'
import { useProfileQuery, useUpdateProfileMutation } from './useProfile'

const EMAIL_CONFLICT_MESSAGE =
  'Este e-mail já está em uso por outra conta. Informe um e-mail diferente.'

const inputBase =
  'mt-1 block w-full rounded-lg border px-3 py-2 text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:bg-slate-100'

function isProfileField(field: string): field is keyof ProfileFormValues {
  return (PROFILE_FIELDS as readonly string[]).includes(field)
}

export function ProfilePage() {
  const { signOut } = useAuth()
  const profileQuery = useProfileQuery()
  const mutation = useUpdateProfileMutation()
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const profile = profileQuery.data

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    // Preenche com os dados do servidor e mantém o que o usuário já editou
    // caso a consulta seja atualizada em segundo plano.
    values: profile ? { name: profile.name, email: profile.email } : undefined,
    resetOptions: { keepDirtyValues: true },
  })

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    setSuccessMessage(null)

    mutation.mutate(values, {
      onSuccess: (updated) => {
        reset({ name: updated.name, email: updated.email })
        setSuccessMessage('Perfil atualizado com sucesso.')
      },
      onError: (error) => {
        const body = getApiErrorBody(error)

        if (error instanceof HttpError && error.status === 409) {
          setError(
            'email',
            { message: EMAIL_CONFLICT_MESSAGE },
            { shouldFocus: true },
          )
          return
        }

        let mappedFieldError = false
        for (const [field, message] of Object.entries(
          body?.fieldErrors ?? {},
        )) {
          if (isProfileField(field)) {
            setError(field, { message }, { shouldFocus: !mappedFieldError })
            mappedFieldError = true
          }
        }

        if (!mappedFieldError) setFormError(getApiErrorMessage(error))
      },
    })
  })

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <span className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          FinaMEI
        </span>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          Meu perfil
        </h1>
        <p className="mt-2 text-slate-600">
          Consulte e atualize seus dados de cadastro.
        </p>
      </header>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        {profileQuery.isPending && (
          <p role="status" className="text-slate-600">
            Carregando seus dados…
          </p>
        )}

        {profileQuery.isError && (
          <div role="alert" className="space-y-4">
            <p className="text-red-700">
              {profileQuery.error instanceof HttpError &&
              profileQuery.error.status === 401
                ? getApiErrorMessage(profileQuery.error)
                : 'Não foi possível carregar seu perfil. Tente novamente.'}
            </p>
            {profileQuery.error instanceof HttpError &&
            profileQuery.error.status === 401 ? (
              <button
                type="button"
                onClick={signOut}
                className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                Entrar novamente
              </button>
            ) : (
              <button
                type="button"
                onClick={() => profileQuery.refetch()}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        {profile && (
          <form noValidate onSubmit={onSubmit} className="space-y-5">
            {formError && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {formError}
              </p>
            )}
            {successMessage && (
              <p
                role="status"
                className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
              >
                {successMessage}
              </p>
            )}

            <div>
              <label
                htmlFor="profile-name"
                className="block text-sm font-medium text-slate-800"
              >
                Nome
              </label>
              <input
                id="profile-name"
                type="text"
                autoComplete="name"
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={
                  errors.name ? 'profile-name-error' : undefined
                }
                className={`${inputBase} ${errors.name ? 'border-red-600' : 'border-slate-300'}`}
                disabled={mutation.isPending}
                {...register('name', {
                  onChange: () => setSuccessMessage(null),
                })}
              />
              {errors.name && (
                <p
                  id="profile-name-error"
                  className="mt-1 text-sm text-red-700"
                >
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="block text-sm font-medium text-slate-800"
              >
                E-mail
              </label>
              <input
                id="profile-email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={
                  errors.email ? 'profile-email-error' : undefined
                }
                className={`${inputBase} ${errors.email ? 'border-red-600' : 'border-slate-300'}`}
                disabled={mutation.isPending}
                {...register('email', {
                  onChange: () => setSuccessMessage(null),
                })}
              />
              {errors.email && (
                <p
                  id="profile-email-error"
                  className="mt-1 text-sm text-red-700"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  reset({ name: profile.name, email: profile.email })
                  setFormError(null)
                }}
                disabled={!isDirty || mutation.isPending}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Descartar alterações
              </button>
              <button
                type="submit"
                disabled={!isDirty || mutation.isPending}
                className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutation.isPending ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  )
}
