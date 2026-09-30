import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import type { Category } from './category-api'
import { CategoriesPage } from './CategoriesPage'

let categorias: Category[]

function jsonResponse(status: number, body?: unknown) {
  return new Response(JSON.stringify(body ?? null), {
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
const escritas = () => chamadas().filter((chamada) => chamada.method !== 'GET')

/** Fake backend that keeps the categories in memory. */
function mockApi(overrides: { create?: () => Response } = {}) {
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    if (method === 'GET') {
      const type = url.searchParams.get('type')
      return jsonResponse(
        200,
        categorias.filter((category) => category.type === type),
      )
    }
    if (method === 'POST') {
      if (overrides.create) return overrides.create()
      const nova: Category = { id: `cat-${body.name}`, active: true, ...body }
      categorias = [...categorias, nova]
      return jsonResponse(201, nova)
    }
    const id = url.pathname.split('/').at(-1)
    categorias = categorias.map((category) =>
      category.id === id ? { ...category, ...body } : category,
    )
    return jsonResponse(
      200,
      categorias.find((category) => category.id === id),
    )
  })
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialSession={{ token: 'token', user: null }}>
        <CategoriesPage />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

const listaDeReceitas = () =>
  screen.getByRole('list', { name: 'Lista de categorias de receita' })

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  categorias = [
    { id: 'cat-vendas', name: 'Vendas', type: 'INCOME', active: true },
    { id: 'cat-antiga', name: 'Encomendas', type: 'INCOME', active: false },
    { id: 'cat-servicos', name: 'Serviços', type: 'INCOME', active: true },
    { id: 'cat-aluguel', name: 'Aluguel', type: 'EXPENSE', active: true },
  ]
  mockApi()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CategoriesPage (OF10, RN07)', () => {
  it('lista as categorias de receita, ativas primeiro, marcando as inativas', async () => {
    renderPage()

    expect(await screen.findByText('Vendas')).toBeInTheDocument()
    const nomes = within(listaDeReceitas())
      .getAllByRole('listitem')
      .map((item) => item.querySelector('p')?.textContent)
    expect(nomes).toEqual(['Serviços', 'Vendas', 'Encomendas'])
    expect(within(listaDeReceitas()).getByText('Inativa')).toBeInTheDocument()
    expect(chamadas()[0].url.searchParams.get('type')).toBe('INCOME')
  })

  it('não oferece excluir, só inativar (RN07)', async () => {
    renderPage()
    await screen.findByText('Vendas')

    expect(
      screen.queryByRole('button', { name: /excluir/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Inativar Vendas' }),
    ).toBeInTheDocument()
  })

  it('mostra as categorias de despesa ao trocar o tipo', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Vendas')

    await user.click(screen.getByLabelText('Despesas'))

    expect(await screen.findByText('Aluguel')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Nova categoria de despesa'),
    ).toBeInTheDocument()
    expect(chamadas().at(-1)?.url.searchParams.get('type')).toBe('EXPENSE')
  })

  it('cria uma categoria e limpa o campo', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Vendas')

    const nome = screen.getByLabelText('Nova categoria de receita')
    await user.type(nome, 'Consultoria')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(
      await screen.findByText('Categoria "Consultoria" criada.'),
    ).toBeInTheDocument()
    expect(nome).toHaveValue('')
    expect(
      await within(listaDeReceitas()).findByText('Consultoria'),
    ).toBeInTheDocument()
    expect(escritas()[0]).toMatchObject({
      method: 'POST',
      body: { name: 'Consultoria', type: 'INCOME' },
    })
  })

  it('valida o nome sem chamar o servidor', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Vendas')

    await user.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(
      await screen.findByText('Informe o nome da categoria.'),
    ).toBeInTheDocument()

    await user.type(
      screen.getByLabelText('Nova categoria de receita'),
      'a'.repeat(61),
    )
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(
      await screen.findByText('O nome deve ter no máximo 60 caracteres.'),
    ).toBeInTheDocument()
    expect(escritas()).toHaveLength(0)
  })

  it('avisa no campo quando o nome já existe (409)', async () => {
    const user = userEvent.setup()
    mockApi({
      create: () =>
        jsonResponse(409, {
          code: 'DATA_CONFLICT',
          message: 'Os dados informados conflitam com um registro existente.',
        }),
    })
    renderPage()
    await screen.findByText('Vendas')

    const nome = screen.getByLabelText('Nova categoria de receita')
    await user.type(nome, 'Vendas')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(
      await screen.findByText(
        'Já existe uma categoria com esse nome. Escolha outro nome.',
      ),
    ).toBeInTheDocument()
    expect(nome).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(nome).toHaveFocus())
  })

  it('renomeia uma categoria', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Renomear Vendas' }),
    )
    const nome = screen.getByLabelText('Novo nome para "Vendas"')
    expect(nome).toHaveValue('Vendas')
    expect(nome).toHaveFocus()

    await user.clear(nome)
    await user.type(nome, 'Vendas de balcão')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByText('Categoria renomeada para "Vendas de balcão".'),
    ).toBeInTheDocument()
    expect(
      await within(listaDeReceitas()).findByText('Vendas de balcão'),
    ).toBeInTheDocument()
    expect(escritas()[0]).toMatchObject({
      method: 'PUT',
      body: { name: 'Vendas de balcão' },
    })
  })

  it('cancela a renomeação sem salvar', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Renomear Vendas' }),
    )
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(
      screen.getByRole('button', { name: 'Renomear Vendas' }),
    ).toBeInTheDocument()
    expect(escritas()).toHaveLength(0)
  })

  it('inativa e reativa uma categoria', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Inativar Serviços' }),
    )

    expect(
      await screen.findByText(/Categoria "Serviços" inativada\./),
    ).toBeInTheDocument()
    await user.click(
      await screen.findByRole('button', { name: 'Reativar Serviços' }),
    )
    expect(
      await screen.findByText('Categoria "Serviços" reativada.'),
    ).toBeInTheDocument()

    expect(escritas().map((chamada) => [chamada.method, chamada.body])).toEqual(
      [
        ['PATCH', { active: false }],
        ['PATCH', { active: true }],
      ],
    )
    expect(escritas()[0].url.pathname).toMatch(/\/categories\/cat-servicos$/)
  })

  it('mostra erro amigável e permite tentar de novo quando a lista falha', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(500))
    renderPage()

    expect(
      await screen.findByText(
        'Não foi possível carregar as categorias agora. Tente novamente.',
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Vendas')).toBeInTheDocument()
  })
})
