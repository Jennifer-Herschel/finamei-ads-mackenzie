import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import type { AccountantAccess } from './accountant-access-api'
import { AccountantAccessPage } from './AccountantAccessPage'

const contadorAna: AccountantAccess = {
  id: 'acesso-1',
  accountant: { name: 'Ana Contabilidade', email: 'ana@contabil.com' },
  grantedAt: '2026-08-10T12:00:00Z',
}

let acessos: AccountantAccess[]

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchMock = vi.fn<typeof fetch>()
const escritas = () =>
  fetchMock.mock.calls
    .filter(([, init]) => (init?.method ?? 'GET') !== 'GET')
    .map(([input, init]) => ({
      url: String(input),
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    }))

/** Fake backend that keeps the grants in memory. */
function mockApi(
  overrides: { grant?: () => Response; revoke?: () => Response } = {},
) {
  fetchMock.mockImplementation(async (input, init) => {
    const method = init?.method ?? 'GET'
    if (method === 'GET') return jsonResponse(200, acessos)
    if (method === 'POST') {
      if (overrides.grant) return overrides.grant()
      const { accountantEmail } = JSON.parse(String(init?.body))
      const novo: AccountantAccess = {
        id: 'acesso-novo',
        accountant: { name: 'Bruno Contador', email: accountantEmail },
        grantedAt: '2026-09-15T12:00:00Z',
      }
      acessos = [...acessos, novo]
      return jsonResponse(201, novo)
    }
    if (overrides.revoke) return overrides.revoke()
    const id = String(input).split('/').at(-1)
    acessos = acessos.filter((item) => item.id !== id)
    return jsonResponse(204)
  })
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialSession={{ token: 'token', user: null }}>
        <AccountantAccessPage />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  acessos = [contadorAna]
  mockApi()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AccountantAccessPage (RN11)', () => {
  it('lista os contadores com acesso e explica o que eles podem fazer', async () => {
    renderPage()

    expect(await screen.findByText('Ana Contabilidade')).toBeInTheDocument()
    expect(screen.getByText('ana@contabil.com')).toBeInTheDocument()
    expect(
      screen.getByText('Acesso liberado em 10/08/2026'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Ele não consegue criar, alterar nem excluir nada.'),
    ).toBeInTheDocument()
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/accountant-access$/)
  })

  it('mostra quando nenhum contador tem acesso', async () => {
    acessos = []
    renderPage()

    expect(
      await screen.findByText('Nenhum contador tem acesso aos seus dados.'),
    ).toBeInTheDocument()
  })

  it('libera o acesso pelo e-mail do contador', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Ana Contabilidade')

    const email = screen.getByLabelText('E-mail do contador')
    await user.type(email, 'bruno@contabil.com')
    await user.click(screen.getByRole('button', { name: 'Liberar acesso' }))

    expect(
      await screen.findByText(
        'Bruno Contador agora pode consultar seus relatórios e seu faturamento.',
      ),
    ).toBeInTheDocument()
    expect(email).toHaveValue('')
    expect(
      await within(
        screen.getByRole('list', { name: 'Contadores com acesso' }),
      ).findByText('Bruno Contador'),
    ).toBeInTheDocument()
    expect(escritas()[0]).toMatchObject({
      method: 'POST',
      body: { accountantEmail: 'bruno@contabil.com' },
    })
  })

  it('valida o e-mail sem chamar o servidor', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Ana Contabilidade')

    await user.click(screen.getByRole('button', { name: 'Liberar acesso' }))
    expect(
      await screen.findByText('Informe o e-mail do contador.'),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('E-mail do contador'), 'bruno')
    await user.click(screen.getByRole('button', { name: 'Liberar acesso' }))
    expect(
      await screen.findByText('Informe um e-mail válido.'),
    ).toBeInTheDocument()
    expect(escritas()).toHaveLength(0)
  })

  it('orienta quando não existe contador com esse e-mail (404)', async () => {
    const user = userEvent.setup()
    mockApi({ grant: () => jsonResponse(404, null) })
    renderPage()
    await screen.findByText('Ana Contabilidade')

    const email = screen.getByLabelText('E-mail do contador')
    await user.type(email, 'ninguem@exemplo.com')
    await user.click(screen.getByRole('button', { name: 'Liberar acesso' }))

    expect(
      await screen.findByText(/Não encontramos um contador com esse e-mail\./),
    ).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(email).toHaveFocus())
  })

  it('avisa quando o contador já tem acesso (409)', async () => {
    const user = userEvent.setup()
    mockApi({ grant: () => jsonResponse(409, null) })
    renderPage()
    await screen.findByText('Ana Contabilidade')

    await user.type(
      screen.getByLabelText('E-mail do contador'),
      'ana@contabil.com',
    )
    await user.click(screen.getByRole('button', { name: 'Liberar acesso' }))

    expect(
      await screen.findByText('Esse contador já tem acesso aos seus dados.'),
    ).toBeInTheDocument()
  })

  it('corta o acesso depois de confirmar', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', {
        name: 'Cortar acesso de Ana Contabilidade',
      }),
    )
    expect(
      screen.getByText(/Ana Contabilidade deixa de ver seus dados na hora\./),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(escritas()).toHaveLength(0)

    await user.click(
      screen.getByRole('button', {
        name: 'Cortar acesso de Ana Contabilidade',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Sim, cortar acesso' }))

    expect(
      await screen.findByText('O acesso de Ana Contabilidade foi cortado.'),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('Nenhum contador tem acesso aos seus dados.'),
    ).toBeInTheDocument()
    expect(escritas()[0]).toMatchObject({
      method: 'DELETE',
      url: expect.stringMatching(/\/accountant-access\/acesso-1$/),
    })
  })

  it('trata como cortado quando o acesso já tinha sido revogado (404)', async () => {
    const user = userEvent.setup()
    mockApi({
      revoke: () => {
        acessos = []
        return jsonResponse(404, null)
      },
    })
    renderPage()

    await user.click(
      await screen.findByRole('button', {
        name: 'Cortar acesso de Ana Contabilidade',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Sim, cortar acesso' }))

    expect(
      await screen.findByText('Nenhum contador tem acesso aos seus dados.'),
    ).toBeInTheDocument()
  })

  it('mostra erro amigável e permite tentar de novo quando a lista falha', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(500, null))
    renderPage()

    expect(
      await screen.findByText(
        'Não foi possível carregar os acessos agora. Tente novamente.',
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Ana Contabilidade')).toBeInTheDocument()
  })
})
