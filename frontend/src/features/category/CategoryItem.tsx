import { useState } from 'react'
import { FormAlert } from '../../components/FormAlert'
import { getApiErrorMessage } from '../../lib/api-error'
import type { Category } from './category-api'
import { CategoryNameForm } from './CategoryNameForm'
import {
  useRenameCategoryMutation,
  useSetCategoryActiveMutation,
} from './useCategories'

const actionButton =
  'rounded-lg px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'

type CategoryItemProps = {
  category: Category
  onChanged: (message: string) => void
}

/** One category with rename and inactivate/reactivate (OF10, RN07). */
export function CategoryItem({ category, onChanged }: CategoryItemProps) {
  const [renaming, setRenaming] = useState(false)
  const renameMutation = useRenameCategoryMutation()
  const activeMutation = useSetCategoryActiveMutation()

  const toggleActive = () =>
    activeMutation.mutate(
      { id: category.id, active: !category.active },
      {
        onSuccess: () =>
          onChanged(
            category.active
              ? `Categoria "${category.name}" inativada. Ela não aparece mais em novos lançamentos, mas continua nos que já existem.`
              : `Categoria "${category.name}" reativada.`,
          ),
      },
    )

  return (
    <li className="py-3">
      {renaming ? (
        <CategoryNameForm
          label={`Novo nome para "${category.name}"`}
          submitLabel="Salvar"
          pendingLabel="Salvando…"
          defaultName={category.name}
          autoFocus
          isPending={renameMutation.isPending}
          onSubmit={(name) =>
            renameMutation.mutateAsync({ id: category.id, name })
          }
          onSaved={(name) => {
            setRenaming(false)
            onChanged(`Categoria renomeada para "${name}".`)
          }}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <p
              className={`break-words font-medium ${
                category.active ? 'text-slate-900' : 'text-slate-500'
              }`}
            >
              {category.name}
            </p>
            {!category.active && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                Inativa
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRenaming(true)}
              aria-label={`Renomear ${category.name}`}
              className={`${actionButton} border border-slate-300 text-slate-800 hover:bg-slate-50`}
            >
              Renomear
            </button>
            <button
              type="button"
              onClick={toggleActive}
              disabled={activeMutation.isPending}
              aria-label={`${category.active ? 'Inativar' : 'Reativar'} ${category.name}`}
              className={`${actionButton} ${
                category.active
                  ? 'text-slate-700 hover:bg-slate-100'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              {category.active ? 'Inativar' : 'Reativar'}
            </button>
          </div>
        </div>
      )}
      {activeMutation.isError && (
        <div className="mt-2">
          <FormAlert tone="error">
            {getApiErrorMessage(activeMutation.error)}
          </FormAlert>
        </div>
      )}
    </li>
  )
}
