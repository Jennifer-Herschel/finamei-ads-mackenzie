import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { AuthProvider } from '../auth/AuthProvider'
import type { Report } from '../report/report-api'
import type { LinkedClient } from './accountant-api'

/** Unsigned JWT carrying only the claims the interface reads. */
function tokenWithRole(role: string) {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=+$/, '')
  return `${encode({ alg: 'HS256' })}.${encode({ sub: '1', role })}.assinatura`
}

const clientes: LinkedClient[] = [
  {
    id: 'cliente-1',
    name: 'Maria Silva ME',
    email: 'maria@exemplo.com',
    grantedAt: '2026-08-10T12:00:00Z',
  },
  {
    id: 'cliente-2',
    name: 'João Souza ME',
    email: 'joao@exemplo.com',
    grantedAt: '2026-09-01T12:00:00Z',
  },
]

const relatorio: Report = {
  period: 'MONTHLY',
  year: 2026,
  month: 9,
  income: 6900,
  expense: 2150,
  balance: 4750,
  transactionCount: 12,
  revenue: {
    year: 2026,
    accumulated: 66400,
    limit: 81000,
    percentage: 81.98,
    band: 'ATTENTION',
    proportionalLimit: false,
    activeMonths: null,
  },
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchMock = vi.fn<typeof fetch>()
const requestedUrls = () => fetchMock.mock.calls.map(([url]) => String(url))

function mockApi({
  clients = () => jsonResponse(200, clientes),
  report = () => jsonResponse(200, relatorio),
}: {
  clients?: () => Response
  report?: (url: string) => Response
} = {}) {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input)
    if (url.endsWith('/accountant/clients')) return clients()
    if (url.includes('/reports')) return report(url)
    return new Promise<Response>(() => {})
  })
}

function renderApp(path: string, role = 'ACCOUNTANT') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialSession={{ token: tokenWithRole(role), user: null }}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Área do contador', () => {
  it('abre na lista de clientes com um menu só de consulta', async () => {
    mockApi()
    renderApp('/')

    expect(
      screen.getByRole('heading', { name: 'Meus clientes' }),
    ).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Meus clientes', 'Meu perfil'])

    expect(await screen.findByText('Maria Silva ME')).toBeInTheDocument()
    expect(screen.getByText('joao@exemplo.com')).toBeInTheDocument()
    expect(
      screen.getByText('Acesso liberado em 10/08/2026'),
    ).toBeInTheDocument()
  })

  it('não deixa o contador abrir as telas do microempreendedor', () => {
    mockApi()
    renderApp('/painel')

    expect(
      screen.getByRole('heading', { name: 'Meus clientes' }),
    ).toBeInTheDocument()
  })

  it('não deixa o microempreendedor abrir a área do contador', () => {
    mockApi()
    renderApp('/clientes', 'MEI')

    expect(
      screen.getByRole('heading', { name: 'Painel', level: 1 }),
    ).toBeInTheDocument()
  })

  it('orienta o contador quando nenhum cliente liberou acesso', async () => {
    mockApi({ clients: () => jsonResponse(200, []) })
    renderApp('/clientes')

    expect(
      await screen.findByText('Nenhum cliente liberou acesso ainda.'),
    ).toBeInTheDocument()
  })

  it('mostra erro amigável quando a lista de clientes falha', async () => {
    mockApi({ clients: () => jsonResponse(500, null) })
    renderApp('/clientes')

    expect(
      await screen.findByText(
        'Não foi possível carregar seus clientes agora. Tente novamente.',
      ),
    ).toBeInTheDocument()
  })

  it('abre o relatório do cliente em modo somente leitura', async () => {
    const user = userEvent.setup()
    mockApi()
    renderApp('/clientes')

    await user.click(
      await screen.findByRole('link', {
        name: 'Ver relatórios de Maria Silva ME',
      }),
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Relatórios de Maria Silva ME',
      }),
    ).toBeInTheDocument()
    expect(await screen.findByText('R$ 6.900,00')).toBeInTheDocument()
    expect(
      requestedUrls().some((url) =>
        /\/accountant\/clients\/cliente-1\/reports\?period=MONTHLY/.test(url),
      ),
    ).toBe(true)
    expect(
      screen.queryByRole('button', { name: /editar|excluir|nova/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Exportar PDF' }),
    ).toBeInTheDocument()
  })

  it('troca de cliente pela lista de seleção', async () => {
    const user = userEvent.setup()
    mockApi()
    renderApp('/clientes/cliente-1/relatorios')

    await user.selectOptions(
      await screen.findByLabelText('Cliente'),
      'João Souza ME',
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Relatórios de João Souza ME',
      }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        requestedUrls().some((url) =>
          url.includes('/accountant/clients/cliente-2/reports?'),
        ),
      ).toBe(true),
    )
  })

  it('avisa e atualiza a lista quando o cliente revoga o acesso (RN11)', async () => {
    mockApi({
      report: () =>
        jsonResponse(403, {
          code: 'ACCESS_DENIED',
          message: 'Você não tem permissão para acessar este recurso.',
        }),
    })
    renderApp('/clientes/cliente-1/relatorios')

    expect(
      await screen.findByText(
        'O acesso aos dados deste cliente não está mais disponível.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Voltar para meus clientes' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        requestedUrls().filter((url) => url.endsWith('/accountant/clients')),
      ).toHaveLength(2),
    )
  })

  it('não consulta relatórios de quem não está na lista de clientes', async () => {
    mockApi()
    renderApp('/clientes/cliente-desconhecido/relatorios')

    expect(
      await screen.findByText(
        'O acesso aos dados deste cliente não está mais disponível.',
      ),
    ).toBeInTheDocument()
    expect(requestedUrls().some((url) => url.includes('/reports'))).toBe(false)
  })
})
