import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatCurrency } from '../../lib/format'
import type { Page } from '../../lib/page'
import { AuthProvider } from '../auth/AuthProvider'
import { AUTH_STORAGE_KEY } from '../auth/auth-context'
import type { Category } from '../category/category-api'
import type { Transaction } from './transaction-api'
import { TransactionsPage } from './TransactionsPage'

const TOKEN = 'token-de-teste'

// Intl uses a non-breaking space between "R$" and the value; text matchers
// normalize it to a regular space, so the expected text must match that.
const moeda = (valor: number) => formatCurrency(valor).replace(/\s/g, ' ')

const HOJE = new Date(2026, 8, 15) // 15/09/2026

const categoriasDeReceita: Category[] = [
  { id: 'cat-vendas', name: 'Vendas', type: 'INCOME', active: true },
  { id: 'cat-servicos', name: 'Serviços', type: 'INCOME', active: true },
  {
    id: 'cat-antiga',
    name: 'Categoria inativa',
    type: 'INCOME',
    active: false,
  },
]

const categoriasDeDespesa: Category[] = [
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

function pagina(
  content: Transaction[],
  extra: Partial<Page<Transaction>> = {},
) {
  return {
    content,
    number: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    ...extra,
  }
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchMock = vi.fn<typeof fetch>()

type Handler = (init?: RequestInit) => Response | Promise<Response>

function mockApi({
  list = () => jsonResponse(200, pagina([venda, aluguel])),
  create = (init) =>
    jsonResponse(201, {
      ...venda,
      id: 't-novo',
      ...JSON.parse(String(init?.body)),
    }),
  categories = (type: string) =>
    jsonResponse(
      200,
      type === 'INCOME' ? categoriasDeReceita : categoriasDeDespesa,
    ),
}: {
  list?: (url: string) => Response | Promise<Response>
  create?: Handler
  categories?: (type: string) => Response | Promise<Response>
} = {}) {
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/categories')) {
      return categories(url.searchParams.get('type') ?? '')
    }
    if (url.pathname.endsWith('/transactions')) {
      return init?.method === 'POST' ? create(init) : list(String(input))
    }
    throw new Error(`URL inesperada: ${url}`)
  })
}

function chamadasDeCriacao() {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
}

function renderPage(path = '/lancamentos') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  sessionStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ token: TOKEN, user: null }),
  )
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <TransactionsPage today={HOJE} />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

async function escolherCategoria(
  user: ReturnType<typeof userEvent.setup>,
  nome: string,
) {
  await screen.findByRole('option', { name: nome })
  await user.selectOptions(screen.getByLabelText('Categoria'), nome)
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TransactionsPage — lista de movimentações', () => {
  it('mostra as movimentações mais recentes com categoria, data e valor', async () => {
    mockApi()
    renderPage()

    expect(screen.getByText('Carregando movimentações…')).toBeInTheDocument()

    const lista = await screen.findByRole('list', {
      name: 'Lista de movimentações',
    })
    const itens = within(lista).getAllByRole('listitem')
    expect(itens).toHaveLength(2)
    expect(itens[0]).toHaveTextContent('Venda de bolos')
    expect(itens[0]).toHaveTextContent('Vendas · 10/09/2026')
    expect(itens[0]).toHaveTextContent(`Receita: + ${moeda(1500)}`)
    expect(itens[1]).toHaveTextContent('Aluguel · 05/09/2026')
    expect(itens[1]).toHaveTextContent(`Despesa: − ${moeda(800.5)}`)

    const listagem = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/transactions?'),
    )
    expect(String(listagem?.[0])).toMatch(
      /\/transactions\?page=0&size=20&sort=date%2Cdesc$/,
    )
    expect(new Headers(listagem?.[1]?.headers).get('Authorization')).toBe(
      `Bearer ${TOKEN}`,
    )
  })

  it('orienta o usuário quando ainda não há lançamentos', async () => {
    mockApi({ list: () => jsonResponse(200, pagina([])) })
    renderPage()

    expect(
      await screen.findByText(/Nenhum lançamento registrado ainda/),
    ).toBeInTheDocument()
  })

  it('mostra erro amigável quando a lista falha e permite tentar de novo', async () => {
    const user = userEvent.setup()
    let tentativas = 0
    mockApi({
      list: () =>
        ++tentativas === 1
          ? jsonResponse(500, null)
          : jsonResponse(200, pagina([venda])),
    })
    renderPage()

    expect(
      await screen.findByText(
        'Não foi possível carregar as movimentações agora. Tente novamente.',
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Venda de bolos')).toBeInTheDocument()
  })

  it('navega entre as páginas quando há muitos lançamentos', async () => {
    const user = userEvent.setup()
    mockApi({
      list: (url) =>
        url.includes('page=1')
          ? jsonResponse(200, pagina([aluguel], { number: 1, totalPages: 2 }))
          : jsonResponse(200, pagina([venda], { totalPages: 2 })),
    })
    renderPage()

    expect(await screen.findByText('Página 1 de 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Próxima' }))

    expect(await screen.findByText('Aluguel da cozinha')).toBeInTheDocument()
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled()
  })
})

describe('TransactionsPage — novo lançamento', () => {
  it('registra uma receita válida e atualiza a lista (OF05)', async () => {
    const user = userEvent.setup()
    mockApi()
    renderPage()

    expect(screen.getByLabelText('Receita')).toBeChecked()
    expect(screen.getByLabelText('Data')).toHaveValue('2026-09-15')
    // Inactive categories are not offered (RN07).
    await screen.findByRole('option', { name: 'Vendas' })
    expect(
      screen.queryByRole('option', { name: 'Categoria inativa' }),
    ).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Valor (R$)'), '1.250,50')
    await escolherCategoria(user, 'Vendas')
    await user.type(screen.getByLabelText('Descrição'), '  Encomenda de doces ')
    await user.click(screen.getByRole('button', { name: 'Registrar receita' }))

    expect(
      await screen.findByText('Receita registrada com sucesso.'),
    ).toBeInTheDocument()

    const [[url, init]] = chamadasDeCriacao()
    expect(String(url)).toMatch(/\/transactions$/)
    expect(new Headers(init?.headers).get('Authorization')).toBe(
      `Bearer ${TOKEN}`,
    )
    expect(JSON.parse(String(init?.body))).toEqual({
      type: 'INCOME',
      amount: 1250.5,
      date: '2026-09-15',
      categoryId: 'cat-vendas',
      description: 'Encomenda de doces',
    })

    // The form is cleared for the next one, keeping type and date.
    expect(screen.getByLabelText('Valor (R$)')).toHaveValue('')
    expect(screen.getByLabelText('Descrição')).toHaveValue('')
    expect(screen.getByLabelText('Receita')).toBeChecked()
    expect(screen.getByLabelText('Data')).toHaveValue('2026-09-15')

    // The list is loaded again to show the new transaction.
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([u]) =>
          String(u).includes('/transactions?'),
        ),
      ).toHaveLength(2),
    )
  })

  it('registra uma despesa com as categorias de despesa (OF07)', async () => {
    const user = userEvent.setup()
    mockApi()
    renderPage()

    await screen.findByRole('option', { name: 'Vendas' })
    await user.click(screen.getByLabelText('Despesa'))

    expect(
      await screen.findByRole('option', { name: 'Aluguel' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: 'Vendas' }),
    ).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Valor (R$)'), '800')
    fireEvent.change(screen.getByLabelText('Data'), {
      target: { value: '2026-09-01' },
    })
    await escolherCategoria(user, 'Aluguel')
    await user.type(screen.getByLabelText('Descrição'), 'Aluguel de setembro')
    await user.click(screen.getByRole('button', { name: 'Registrar despesa' }))

    expect(
      await screen.findByText('Despesa registrada com sucesso.'),
    ).toBeInTheDocument()
    const [[, init]] = chamadasDeCriacao()
    expect(JSON.parse(String(init?.body))).toEqual({
      type: 'EXPENSE',
      amount: 800,
      date: '2026-09-01',
      categoryId: 'cat-aluguel',
      description: 'Aluguel de setembro',
    })
  })

  it('já abre como despesa quando vem do botão "Nova despesa" do painel', async () => {
    mockApi()
    renderPage('/lancamentos?tipo=despesa')

    expect(screen.getByLabelText('Despesa')).toBeChecked()
    expect(
      await screen.findByRole('option', { name: 'Aluguel' }),
    ).toBeInTheDocument()
  })

  it('indica os campos obrigatórios sem enviar nada ao servidor', async () => {
    const user = userEvent.setup()
    mockApi()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Registrar receita' }))

    expect(screen.getByLabelText('Valor (R$)')).toHaveAccessibleDescription(
      'Informe o valor. Use vírgula para os centavos.',
    )
    expect(screen.getByLabelText('Categoria')).toHaveAccessibleDescription(
      'Selecione uma categoria.',
    )
    expect(screen.getByLabelText('Descrição')).toHaveAccessibleDescription(
      'Informe a descrição. Até 120 caracteres.',
    )
    expect(chamadasDeCriacao()).toHaveLength(0)
  })

  it('aplica as regras de RN06 para valor, data e descrição', async () => {
    const user = userEvent.setup()
    mockApi()
    renderPage()

    const valor = screen.getByLabelText('Valor (R$)')
    await user.type(valor, '0')
    fireEvent.change(screen.getByLabelText('Data'), {
      target: { value: '2026-09-16' },
    })
    await escolherCategoria(user, 'Vendas')
    await user.type(screen.getByLabelText('Descrição'), 'a'.repeat(121))
    await user.click(screen.getByRole('button', { name: 'Registrar receita' }))

    expect(
      await screen.findByText('O valor deve ser maior que zero.'),
    ).toBeInTheDocument()
    expect(screen.getByText('A data não pode ser futura.')).toBeInTheDocument()
    expect(
      screen.getByText('A descrição deve ter no máximo 120 caracteres.'),
    ).toBeInTheDocument()

    await user.clear(valor)
    await user.type(valor, '10,999')
    await user.click(screen.getByRole('button', { name: 'Registrar receita' }))

    expect(
      await screen.findByText(
        'Informe o valor em reais, com até duas casas decimais (ex.: 1.250,50).',
      ),
    ).toBeInTheDocument()
    expect(chamadasDeCriacao()).toHaveLength(0)
  })

  it('mostra no campo o erro devolvido pelo servidor', async () => {
    const user = userEvent.setup()
    mockApi({
      create: () =>
        jsonResponse(400, {
          code: 'VALIDATION_ERROR',
          message: 'Os dados informados são inválidos.',
          fieldErrors: {
            categoryId: 'A categoria selecionada está inativa.',
          },
        }),
    })
    renderPage()

    await user.type(screen.getByLabelText('Valor (R$)'), '100')
    await escolherCategoria(user, 'Vendas')
    await user.type(screen.getByLabelText('Descrição'), 'Venda')
    await user.click(screen.getByRole('button', { name: 'Registrar receita' }))

    expect(
      await screen.findByText('A categoria selecionada está inativa.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Categoria')).toHaveFocus()
    expect(
      screen.queryByText('Receita registrada com sucesso.'),
    ).not.toBeInTheDocument()
  })

  it('mostra um erro geral quando o servidor falha sem erro de campo', async () => {
    const user = userEvent.setup()
    mockApi({ create: () => jsonResponse(500, null) })
    renderPage()

    await user.type(screen.getByLabelText('Valor (R$)'), '100')
    await escolherCategoria(user, 'Vendas')
    await user.type(screen.getByLabelText('Descrição'), 'Venda')
    await user.click(screen.getByRole('button', { name: 'Registrar receita' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível concluir a operação. Tente novamente em instantes.',
    )
    // What was typed is kept so the user can try again.
    expect(screen.getByLabelText('Valor (R$)')).toHaveValue('100')
  })

  it('permite tentar de novo quando as categorias não carregam', async () => {
    const user = userEvent.setup()
    let tentativas = 0
    mockApi({
      categories: () =>
        ++tentativas === 1
          ? jsonResponse(500, null)
          : jsonResponse(200, categoriasDeReceita),
    })
    renderPage()

    expect(
      await screen.findByText(
        'Não foi possível carregar as categorias. Tente novamente.',
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(
      await screen.findByRole('option', { name: 'Vendas' }),
    ).toBeInTheDocument()
  })
})
