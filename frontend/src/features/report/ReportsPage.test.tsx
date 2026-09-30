import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import type { Report } from './report-api'
import { ReportsPage } from './ReportsPage'

const TOKEN = 'token-de-teste'
const HOJE = new Date(2026, 8, 15) // 15/09/2026

const relatorioMensal: Report = {
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

const relatorioAnual: Report = {
  ...relatorioMensal,
  period: 'ANNUAL',
  month: null,
  income: 66400,
  expense: 18900,
  balance: 47500,
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchMock = vi.fn<typeof fetch>()
const requestedUrls = () => fetchMock.mock.calls.map(([url]) => String(url))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialSession={{ token: TOKEN, user: null }}>
        <ReportsPage today={HOJE} />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

let savedFiles: string[]

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  savedFiles = []
  URL.createObjectURL = vi.fn(() => 'blob:relatorio')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    savedFiles.push(this.download)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ReportsPage', () => {
  it('abre com o relatório do mês atual consolidado', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, relatorioMensal))
    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Relatório de setembro de 2026' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('R$ 6.900,00')).toBeInTheDocument()
    expect(screen.getByText('R$ 2.150,00')).toBeInTheDocument()
    expect(screen.getByText('R$ 4.750,00')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '81',
    )

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toMatch(/\/reports\?period=MONTHLY&year=2026&month=9$/)
    expect(new Headers(init?.headers).get('Authorization')).toBe(
      `Bearer ${TOKEN}`,
    )
  })

  it('troca para o relatório anual sem enviar o mês', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(async (input) =>
      jsonResponse(
        200,
        String(input).includes('ANNUAL') ? relatorioAnual : relatorioMensal,
      ),
    )
    renderPage()
    await screen.findByText('R$ 6.900,00')

    await user.selectOptions(screen.getByLabelText('Tipo'), 'Anual')

    expect(screen.queryByLabelText('Mês')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Relatório anual de 2026' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('R$ 47.500,00')).toBeInTheDocument()
    expect(requestedUrls().at(-1)).toMatch(
      /\/reports\?period=ANNUAL&year=2026$/,
    )
  })

  it('consulta outro mês e outro ano', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(jsonResponse(200, relatorioMensal))
    renderPage()
    await screen.findByText('R$ 6.900,00')

    await user.selectOptions(screen.getByLabelText('Mês'), 'Março')
    await user.selectOptions(screen.getByLabelText('Ano'), '2025')

    await waitFor(() =>
      expect(requestedUrls().at(-1)).toMatch(
        /\/reports\?period=MONTHLY&year=2025&month=3$/,
      ),
    )
    expect(
      screen.getByRole('heading', { name: 'Relatório de março de 2025' }),
    ).toBeInTheDocument()
  })

  it('indica quando o período não tem lançamentos', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        ...relatorioMensal,
        income: 0,
        expense: 0,
        balance: 0,
        transactionCount: 0,
      }),
    )
    renderPage()

    expect(
      await screen.findByText(
        'Nenhum lançamento neste período. Os valores estão zerados.',
      ),
    ).toBeInTheDocument()
  })

  it('mostra erro amigável e permite tentar de novo quando o relatório falha', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(jsonResponse(500, null))
      .mockResolvedValueOnce(jsonResponse(200, relatorioMensal))
    renderPage()

    expect(
      await screen.findByText(
        'Não foi possível carregar o relatório agora. Tente novamente.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Exportar PDF' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('R$ 6.900,00')).toBeInTheDocument()
  })

  it('exporta o relatório em PDF com o nome enviado pelo servidor', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, relatorioMensal))
      .mockResolvedValueOnce(
        new Response('%PDF-1.7', {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition':
              'attachment; filename="relatorio-2026-09.pdf"',
          },
        }),
      )
    renderPage()
    await screen.findByText('R$ 6.900,00')

    await user.click(screen.getByRole('button', { name: 'Exportar PDF' }))

    await waitFor(() => expect(savedFiles).toEqual(['relatorio-2026-09.pdf']))
    expect(requestedUrls()[1]).toMatch(
      /\/reports\/export\?period=MONTHLY&year=2026&month=9&format=PDF$/,
    )
  })

  it('usa um nome padrão para a planilha quando o servidor não envia um', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, relatorioMensal))
      .mockResolvedValueOnce(new Response('planilha', { status: 200 }))
    renderPage()
    await screen.findByText('R$ 6.900,00')

    await user.click(screen.getByRole('button', { name: 'Exportar planilha' }))

    await waitFor(() =>
      expect(savedFiles).toEqual(['relatorio-finamei-2026-09.xlsx']),
    )
    expect(requestedUrls()[1]).toMatch(/format=XLSX$/)
  })

  it('mantém o relatório na tela e permite tentar de novo quando a exportação falha', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, relatorioMensal))
      .mockResolvedValueOnce(jsonResponse(500, null))
    renderPage()
    await screen.findByText('R$ 6.900,00')

    await user.click(screen.getByRole('button', { name: 'Exportar PDF' }))

    expect(
      await screen.findByText(
        'Não foi possível gerar o arquivo. Tente novamente.',
      ),
    ).toHaveAttribute('role', 'alert')
    expect(screen.getByText('R$ 6.900,00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeEnabled()
    expect(savedFiles).toEqual([])
  })
})
