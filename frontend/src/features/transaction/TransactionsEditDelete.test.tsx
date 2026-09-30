import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import type { Category } from '../category/category-api'
import type { Transaction } from './transaction-api'
import { TransactionsPage } from './TransactionsPage'

const HOJE = new Date(2026, 8, 15) // 15/09/2026

const categorias: Category[] = [
  { id: 'cat-vendas', name: 'Vendas', type: 'INCOME', active: true },
  { id: 'cat-antiga', name: 'Encomendas', type: 'INCOME', active: false },
  { id: 'cat-aluguel', name: 'Aluguel', type: 'EXPENSE', active: true },
]

const venda: Transaction = {
  id: 't-1',
  type: 'INCOME',
  amount: 1500,
  date: '2026-09-10',
  description: 'Venda de bolos',
  category: { id: 'cat-vendas', name: 'Vendas' },
}

const aluguel: Transaction = {
  id: 't-2',
  type: 'EXPENSE',
  amount: 800.5,
  date: '2026-09-05',
  description: 'Aluguel da cozinha',
  category: { id: 'cat-aluguel', name: 'Aluguel' },
}

const encomenda: Transaction = {
  id: 't-3',
  type: 'INCOME',
  amount: 300,
  date: '2026-08-20',
  description: 'Encomenda de doces',
  category: { id: 'cat-antiga', name: 'Encomendas' },
}

let lancamentos: Transaction[]

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchMock = vi.fn<typeof fetch>()
const chamadas = () =>
  fetchMock.mock.calls.map(([input, init]) => ({
    url: new URL(String(input)),
    method: init?.method ?? 'GET',
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  }))
const listagens = () =>
  chamadas().filter(
    (chamada) =>
      chamada.method === 'GET' &&
      chamada.url.pathname.endsWith('/transactions'),
  )

/** Fake backend: keeps the transactions in memory and applies the filters. */
function mockApi(
  overrides: { update?: () => Response; remove?: () => Response } = {},
) {
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    if (url.pathname.endsWith('/categories')) {
      const type = url.searchParams.get('type')
      return jsonResponse(
        200,
        categorias.filter((category) => category.type === type),
      )
    }
    if (url.pathname.endsWith('/transactions') && method === 'GET') {
      const p = url.searchParams
      const content = lancamentos.filter(
        (item) =>
          (!p.get('from') || item.date >= p.get('from')!) &&
          (!p.get('to') || item.date <= p.get('to')!) &&
          (!p.get('type') || item.type === p.get('type')) &&
          (!p.get('categoryId') || item.category.id === p.get('categoryId')) &&
          (!p.get('description') ||
            item.description
              .toLowerCase()
              .includes(p.get('description')!.toLowerCase())),
      )
      return jsonResponse(200, {
        content,
        number: 0,
        size: 20,
        totalElements: content.length,
        totalPages: content.length ? 1 : 0,
      })
    }
    const id = /\/transactions\/([^/]+)$/.exec(url.pathname)?.[1]
    if (method === 'PUT') {
      if (overrides.update) return overrides.update()
      const body = JSON.parse(String(init?.body))
      const category = categorias.find((item) => item.id === body.categoryId)!
      const atualizado: Transaction = {
        id: id!,
        type: body.type,
        amount: body.amount,
        date: body.date,
        description: body.description,
        category: { id: category.id, name: category.name },
      }
      lancamentos = lancamentos.map((item) =>
        item.id === id ? atualizado : item,
      )
      return jsonResponse(200, atualizado)
    }
    if (method === 'DELETE') {
      if (overrides.remove) return overrides.remove()
      lancamentos = lancamentos.filter((item) => item.id !== id)
      return jsonResponse(204)
    }
    throw new Error(`Chamada inesperada: ${method} ${url}`)
  })
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialSession={{ token: 'token', user: null }}>
        <MemoryRouter initialEntries={['/lancamentos']}>
          <TransactionsPage today={HOJE} />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

const lista = () => screen.getByRole('list', { name: 'Lista de movimentações' })

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  lancamentos = [venda, aluguel, encomenda]
  mockApi()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TransactionsPage — editar (OF06, OF08)', () => {
  it('abre o lançamento no formulário, salva a alteração e atualiza a lista', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Editar Venda de bolos' }),
    )

    expect(
      screen.getByRole('heading', { name: 'Editar lançamento' }),
    ).toBeInTheDocument()
    const valor = screen.getByLabelText('Valor (R$)')
    expect(valor).toHaveValue('1500,00')
    await waitFor(() => expect(valor).toHaveFocus())
    expect(screen.getByLabelText('Data')).toHaveValue('2026-09-10')
    expect(screen.getByLabelText('Descrição')).toHaveValue('Venda de bolos')
    await waitFor(() =>
      expect(screen.getByLabelText('Categoria')).toHaveValue('cat-vendas'),
    )

    await user.clear(valor)
    await user.type(valor, '1.650,00')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(
      await screen.findByText('Lançamento atualizado com sucesso.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Novo lançamento' }),
    ).toBeInTheDocument()
    expect(await within(lista()).findByText('R$ 1.650,00')).toBeInTheDocument()
    expect(
      chamadas().find((chamada) => chamada.method === 'PUT'),
    ).toMatchObject({
      url: expect.objectContaining({
        pathname: expect.stringMatching(/\/transactions\/t-1$/),
      }),
      body: {
        type: 'INCOME',
        amount: 1650,
        date: '2026-09-10',
        categoryId: 'cat-vendas',
        description: 'Venda de bolos',
      },
    })
  })

  it('cancela a edição sem alterar nada (3a)', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Editar Venda de bolos' }),
    )
    await user.clear(screen.getByLabelText('Descrição'))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(
      screen.getByRole('heading', { name: 'Novo lançamento' }),
    ).toBeInTheDocument()
    expect(chamadas().some((chamada) => chamada.method === 'PUT')).toBe(false)
  })

  it('valida os dados alterados antes de gravar (4a, RN06)', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Editar Venda de bolos' }),
    )
    await user.clear(screen.getByLabelText('Descrição'))
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Informe a descrição.')).toBeInTheDocument()
    expect(chamadas().some((chamada) => chamada.method === 'PUT')).toBe(false)
  })

  it('mantém a categoria inativa de um lançamento antigo ao editar (RN07)', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', {
        name: 'Editar Encomenda de doces',
      }),
    )

    expect(
      await screen.findByRole('option', { name: 'Encomendas (inativa)' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByLabelText('Categoria')).toHaveValue('cat-antiga'),
    )
  })

  it('avisa quando o lançamento foi excluído em outra sessão (4c)', async () => {
    const user = userEvent.setup()
    mockApi({ update: () => jsonResponse(404, null) })
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Editar Venda de bolos' }),
    )
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(
      await screen.findByText(
        'Este lançamento não existe mais. Ele pode ter sido excluído em outra sessão.',
      ),
    ).toBeInTheDocument()
  })
})

describe('TransactionsPage — excluir (OF06, OF08, RN08)', () => {
  it('exclui depois de confirmar e tira o lançamento da lista', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Excluir Aluguel da cozinha' }),
    )
    const confirmacao = screen.getByRole('group', {
      name: 'Confirmar exclusão de Aluguel da cozinha',
    })
    expect(
      within(confirmacao).getByText(
        'Excluir este lançamento? O saldo e o faturamento serão recalculados.',
      ),
    ).toBeInTheDocument()

    await user.click(
      within(confirmacao).getByRole('button', { name: 'Cancelar' }),
    )
    expect(chamadas().some((chamada) => chamada.method === 'DELETE')).toBe(
      false,
    )

    await user.click(
      screen.getByRole('button', { name: 'Excluir Aluguel da cozinha' }),
    )
    await user.click(screen.getByRole('button', { name: 'Sim, excluir' }))

    expect(await screen.findByText('Lançamento excluído.')).toBeInTheDocument()
    await waitFor(() =>
      expect(
        within(lista()).queryByText('Aluguel da cozinha'),
      ).not.toBeInTheDocument(),
    )
    expect(
      chamadas().find((chamada) => chamada.method === 'DELETE')?.url.pathname,
    ).toMatch(/\/transactions\/t-2$/)
  })

  it('avisa e atualiza a lista quando já tinha sido excluído (4c)', async () => {
    const user = userEvent.setup()
    mockApi({
      remove: () => {
        lancamentos = lancamentos.filter((item) => item.id !== 't-2')
        return jsonResponse(404, null)
      },
    })
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Excluir Aluguel da cozinha' }),
    )
    await user.click(screen.getByRole('button', { name: 'Sim, excluir' }))

    expect(
      await screen.findByText('Este lançamento já tinha sido excluído.'),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        within(lista()).queryByText('Aluguel da cozinha'),
      ).not.toBeInTheDocument(),
    )
  })

  it('fecha a edição quando o lançamento em edição é excluído', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Editar Venda de bolos' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Excluir Venda de bolos' }),
    )
    await user.click(screen.getByRole('button', { name: 'Sim, excluir' }))

    expect(
      await screen.findByRole('heading', { name: 'Novo lançamento' }),
    ).toBeInTheDocument()
  })
})

describe('TransactionsPage — filtros (OF09)', () => {
  it('filtra por período, tipo, categoria e descrição', async () => {
    const user = userEvent.setup()
    renderPage()
    await within(await screen.findByRole('list')).findByText('Venda de bolos')

    const categoria = screen.getByLabelText('Filtrar por categoria')
    expect(categoria).toBeDisabled()

    await user.type(screen.getByLabelText('Período: de'), '2026-09-01')
    await user.type(screen.getByLabelText('Período: até'), '2026-09-30')
    await user.selectOptions(
      screen.getByLabelText('Filtrar por tipo'),
      'Despesas',
    )
    expect(categoria).toBeEnabled()
    await screen.findByRole('option', { name: 'Aluguel' })
    await user.selectOptions(categoria, 'Aluguel')
    await user.type(screen.getByLabelText('Filtrar por descrição'), 'cozinha')
    await user.click(screen.getByRole('button', { name: 'Filtrar' }))

    await waitFor(() =>
      expect(
        within(lista()).queryByText('Venda de bolos'),
      ).not.toBeInTheDocument(),
    )
    expect(within(lista()).getByText('Aluguel da cozinha')).toBeInTheDocument()
    expect(
      Object.fromEntries(listagens().at(-1)!.url.searchParams),
    ).toMatchObject({
      from: '2026-09-01',
      to: '2026-09-30',
      type: 'EXPENSE',
      categoryId: 'cat-aluguel',
      description: 'cozinha',
      page: '0',
    })
  })

  it('não aceita data final antes da inicial', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Venda de bolos')
    const antes = listagens().length

    await user.type(screen.getByLabelText('Período: de'), '2026-09-10')
    await user.type(screen.getByLabelText('Período: até'), '2026-09-01')
    await user.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(
      await screen.findByText(
        'A data final deve ser igual ou posterior à data inicial.',
      ),
    ).toBeInTheDocument()
    expect(listagens()).toHaveLength(antes)
  })

  it('avisa quando nada combina com os filtros e permite limpar', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Venda de bolos')

    await user.type(screen.getByLabelText('Filtrar por descrição'), 'xyz')
    await user.click(screen.getByRole('button', { name: 'Filtrar' }))

    expect(
      await screen.findByText(
        'Nenhum lançamento encontrado com esses filtros.',
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    expect(await screen.findByText('Venda de bolos')).toBeInTheDocument()
    expect(screen.getByLabelText('Filtrar por descrição')).toHaveValue('')
    expect(listagens().at(-1)!.url.searchParams.has('description')).toBe(false)
  })
})
