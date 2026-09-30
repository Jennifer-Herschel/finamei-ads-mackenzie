import { useState } from 'react'
import { SectionError } from '../../components/SectionError'
import { SelectField } from '../../components/SelectField'
import { toIsoDate } from '../../lib/format'
import { DasGuideItem } from './DasGuideItem'
import { useDasGuidesQuery } from './useDas'

const YEARS_AVAILABLE = 5

type DasPageProps = {
  /** Reference date; defaults to now. Useful in tests. */
  today?: Date
}

/** Monthly DAS guides with their status and the payment action (OF14, RN05). */
export function DasPage({ today = new Date() }: DasPageProps) {
  const currentYear = today.getFullYear()
  const [year, setYear] = useState(currentYear)
  const query = useDasGuidesQuery(year)
  const guides = query.data
  const overdueCount =
    guides?.filter((guide) => guide.status === 'OVERDUE').length ?? 0
  const years = Array.from(
    { length: YEARS_AVAILABLE },
    (_, index) => currentYear - index,
  )

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Controle do DAS
          </h1>
          <p className="mt-1 text-slate-600">
            Situação das guias mensais de {year}.
          </p>
        </div>
        <SelectField
          label="Ano"
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
          className="w-32"
        >
          {years.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectField>
      </header>

      <section
        aria-label={`Guias do DAS de ${year}`}
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        {query.isPending && (
          <p role="status" className="text-slate-600">
            Carregando guias…
          </p>
        )}

        {query.isError && (
          <SectionError
            message="Não foi possível carregar as guias do DAS agora. Tente novamente."
            onRetry={() => query.refetch()}
          />
        )}

        {guides && overdueCount > 0 && (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {overdueCount === 1
              ? 'Você tem 1 guia em atraso.'
              : `Você tem ${overdueCount} guias em atraso.`}{' '}
            Pague o quanto antes para evitar multa e juros e manter o MEI em
            dia.
          </p>
        )}

        {guides?.length === 0 && (
          <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
            Nenhuma guia encontrada para {year}.
          </p>
        )}

        {guides && guides.length > 0 && (
          <ul>
            {guides.map((guide) => (
              <DasGuideItem
                key={guide.id}
                guide={guide}
                todayIso={toIsoDate(today)}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
