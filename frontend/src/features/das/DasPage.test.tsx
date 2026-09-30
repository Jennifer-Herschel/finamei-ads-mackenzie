import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import type { DasGuide } from './das-api'
import { DasPage } from './DasPage'

const TOKEN = 'token-de-teste'
const HOJE = new Date(2026, 8, 15) // 15/09/2026

function guia(mes: number, dados: Partial<DasGuide> = {}): DasGuide {
  const referencia = `2026-${String(mes).padStart(2, '0')}`
  const vencimento = `2026-${String(mes + 1).padStart(2, '0')}-20`
  return {
    id: `guia-${mes}`,
    referenceMonth: referencia,
    amount: 76.9,
    dueDate: mes === 12 ? '2027-01-20' : vencimento,
    status: 'PENDING',
    paidAt: null,
    ...dados,
  }
}

let guias: DasGuide[]

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchMock = vi.fn<typeof fetch>()
const chamadas = () =>
  fetchMock.mock.calls.map(([url, init]) => ({
    url: String(url),
    method: init?.method ?? 'GET',
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  }))

/** Fake backend that keeps the guides in memory. */
function mockApi() {
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (method === 'GET' && url.includes('/das?')) {
      return jsonResponse(200, guias)
    }
    const id = /\/das\/([^/]+)\/payment$/.exec(url)?.[1]
    const atual = guias.find((item) => item.id === id)
    if (!atual) return jsonResponse(404, null)
    const atualizada: DasGuide =
      method === 'PUT'
        ? {
            ...atual,
            status: 'PAID',
            paidAt: JSON.parse(String(init?.body)).paidAt,
          }
        : { ...atual, status: 'OVERDUE', paidAt: null }
    guias = guias.map((item) => (item.id === id ? atualizada : item))
    return jsonResponse(200, atualizada)
  })
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialSession={{ token: TOKEN, user: null }}>
        <DasPage today={HOJE} />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

function linhaDoMes(mes: string) {
  const nome = screen.getByText(mes, { selector: 'p' })
  return nome.closest('li') as HTMLElement
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  guias = [
    guia(6, { status: 'PAID', paidAt: '2026-07-15' }),
    guia(7, { status: 'OVERDUE' }),
    guia(8),
    guia(9),
    guia(10),
  ]
  mockApi()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DasPage', () => {
  it('lista as guias do ano com valor, vencimento e situação (RN05)', async () => {
    renderPage()

    expect(await screen.findByText('junho')).toBeInTheDocument()
    expect(within(linhaDoMes('junho')).getByText('Pago')).toBeInTheDocument()
    expect(
      within(linhaDoMes('junho')).getByText('Pago em 15/07/2026'),
    ).toBeInTheDocument()
    expect(
      within(linhaDoMes('julho')).getByText('Em atraso'),
    ).toBeInTheDocument()
    expect(
      within(linhaDoMes('agosto')).getByText('R$ 76,90 · vence em 20/09/2026'),
    ).toBeInTheDocument()
    expect(
      within(linhaDoMes('agosto')).getByText('Pendente'),
    ).toBeInTheDocument()
    expect(screen.getByText(/Você tem 1 guia em atraso\./)).toBeInTheDocument()

    const [primeira] = chamadas()
    expect(primeira.url).toMatch(/\/das\?year=2026$/)
    expect(
      new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization'),
    ).toBe(`Bearer ${TOKEN}`)
  })

  it('não oferece pagamento para o mês em andamento nem para meses futuros', async () => {
    renderPage()
    await screen.findByText('setembro')

    expect(
      within(linhaDoMes('setembro')).getByText('Mês em andamento'),
    ).toBeInTheDocument()
    expect(
      within(linhaDoMes('outubro')).getByText('Mês futuro'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /DAS de setembro como pago/ }),
    ).not.toBeInTheDocument()
  })

  it('marca uma guia como paga com a data informada e atualiza a lista', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', {
        name: 'Marcar DAS de agosto como pago',
      }),
    )
    const data = screen.getByLabelText('Data do pagamento')
    expect(data).toHaveValue('2026-09-15')
    await user.clear(data)
    await user.type(data, '2026-09-10')
    await user.click(
      screen.getByRole('button', { name: 'Confirmar pagamento' }),
    )

    expect(
      await screen.findByText('Pagamento do DAS de agosto registrado.'),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        within(linhaDoMes('agosto')).getByText('Pago em 10/09/2026'),
      ).toBeInTheDocument(),
    )
    expect(
      chamadas().find((chamada) => chamada.method === 'PUT'),
    ).toMatchObject({
      url: expect.stringMatching(/\/das\/guia-8\/payment$/),
      body: { paidAt: '2026-09-10' },
    })
  })

  it('recusa data de pagamento futura sem chamar o servidor (4a)', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', {
        name: 'Marcar DAS de agosto como pago',
      }),
    )
    const data = screen.getByLabelText('Data do pagamento')
    await user.clear(data)
    await user.type(data, '2026-09-16')
    await user.click(
      screen.getByRole('button', { name: 'Confirmar pagamento' }),
    )

    expect(
      await screen.findByText('A data do pagamento não pode ser futura.'),
    ).toBeInTheDocument()
    expect(data).toHaveAttribute('aria-invalid', 'true')
    expect(chamadas().some((chamada) => chamada.method === 'PUT')).toBe(false)
  })

  it('pede confirmação quando a data é anterior ao mês da guia (4b)', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', {
        name: 'Marcar DAS de agosto como pago',
      }),
    )
    const data = screen.getByLabelText('Data do pagamento')
    await user.clear(data)
    await user.type(data, '2026-07-31')
    await user.click(
      screen.getByRole('button', { name: 'Confirmar pagamento' }),
    )

    expect(
      await screen.findByText(/Essa data é anterior a agosto/),
    ).toBeInTheDocument()
    expect(chamadas().some((chamada) => chamada.method === 'PUT')).toBe(false)

    await user.click(
      screen.getByRole('button', { name: 'Confirmar mesmo assim' }),
    )

    await waitFor(() =>
      expect(
        chamadas().find((chamada) => chamada.method === 'PUT')?.body,
      ).toEqual({ paidAt: '2026-07-31' }),
    )
  })

  it('mostra no campo o erro de data enviado pelo servidor', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(async (_input, init) =>
      (init?.method ?? 'GET') === 'GET'
        ? jsonResponse(200, guias)
        : jsonResponse(400, {
            code: 'VALIDATION_ERROR',
            message: 'Os dados informados são inválidos.',
            fieldErrors: {
              paidAt: 'A data do pagamento não pode ser futura.',
            },
          }),
    )
    renderPage()

    await user.click(
      await screen.findByRole('button', {
        name: 'Marcar DAS de agosto como pago',
      }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Confirmar pagamento' }),
    )

    expect(
      await screen.findByText('A data do pagamento não pode ser futura.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Data do pagamento')).toHaveFocus()
  })

  it('desfaz um pagamento marcado por engano depois de confirmar (3a)', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', {
        name: 'Desfazer pagamento do DAS de junho',
      }),
    )
    expect(
      screen.getByText(/Voltar o DAS de junho para pendente\?/),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(chamadas().some((chamada) => chamada.method === 'DELETE')).toBe(
      false,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Desfazer pagamento do DAS de junho',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Sim, desfazer' }))

    expect(
      await screen.findByText('O DAS de junho voltou para pendente.'),
    ).toBeInTheDocument()
    expect(
      chamadas().find((chamada) => chamada.method === 'DELETE')?.url,
    ).toMatch(/\/das\/guia-6\/payment$/)
    await waitFor(() =>
      expect(
        within(linhaDoMes('junho')).getByText('Em atraso'),
      ).toBeInTheDocument(),
    )
  })

  it('consulta as guias de outro ano', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('junho')

    await user.selectOptions(screen.getByLabelText('Ano'), '2025')

    await waitFor(() =>
      expect(chamadas().at(-1)?.url).toMatch(/\/das\?year=2025$/),
    )
    expect(
      screen.getByText('Situação das guias mensais de 2025.'),
    ).toBeInTheDocument()
  })

  it('mostra erro amigável e permite tentar de novo quando a lista falha', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(500, null))
    renderPage()

    expect(
      await screen.findByText(
        'Não foi possível carregar as guias do DAS agora. Tente novamente.',
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('junho')).toBeInTheDocument()
  })
})
