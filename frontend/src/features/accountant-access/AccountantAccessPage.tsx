import { useState } from 'react'
import { SectionError } from '../../components/SectionError'
import { AccessItem } from './AccessItem'
import { GrantAccessForm } from './GrantAccessForm'
import { useAccountantAccessesQuery } from './useAccountantAccess'

/** The MEI grants and revokes the accountant's read-only access (RN11). */
export function AccountantAccessPage() {
  const query = useAccountantAccessesQuery()
  const [message, setMessage] = useState<string | null>(null)
  const accesses = query.data

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Acesso do contador
        </h1>
        <p className="mt-1 text-slate-600">
          Libere para o seu contador a consulta dos seus relatórios e do seu
          faturamento.
        </p>
      </header>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">
          O que o contador pode fazer
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Consultar seus relatórios e seu faturamento, e exportá-los.</li>
          <li>Ele não consegue criar, alterar nem excluir nada.</li>
          <li>
            Você pode cortar o acesso a qualquer momento, com efeito na hora.
          </li>
        </ul>
      </div>

      <section
        aria-labelledby="grant-title"
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2 id="grant-title" className="text-lg font-semibold text-slate-900">
          Liberar acesso
        </h2>
        <div className="mt-3">
          <GrantAccessForm onGranted={setMessage} />
        </div>

        {message && (
          <p role="status" className="mt-3 text-sm text-emerald-800">
            {message}
          </p>
        )}

        <h2 className="mt-6 border-t border-slate-200 pt-4 text-lg font-semibold text-slate-900">
          Contadores com acesso
        </h2>

        {query.isPending && (
          <p role="status" className="mt-3 text-slate-600">
            Carregando…
          </p>
        )}
        {query.isError && (
          <div className="mt-3">
            <SectionError
              message="Não foi possível carregar os acessos agora. Tente novamente."
              onRetry={() => query.refetch()}
            />
          </div>
        )}
        {accesses?.length === 0 && (
          <p className="mt-3 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
            Nenhum contador tem acesso aos seus dados.
          </p>
        )}
        {accesses && accesses.length > 0 && (
          <ul
            aria-label="Contadores com acesso"
            className="divide-y divide-slate-200"
          >
            {accesses.map((access) => (
              <AccessItem
                key={access.id}
                access={access}
                onRevoked={setMessage}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
