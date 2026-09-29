import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './features/auth/AuthProvider'
import {
  AUTH_STORAGE_KEY,
  type AuthSession,
} from './features/auth/auth-context'

const fetchMock = vi.fn<typeof fetch>()

function renderApp(path: string, session?: AuthSession | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialSession={session}>
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
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('renderiza a página de login', () => {
    renderApp('/login', null)

    expect(
      screen.getByRole('heading', { name: 'Entrar no FinaMEI' }),
    ).toBeInTheDocument()
  })

  it('redireciona para o login ao acessar o perfil sem sessão', () => {
    renderApp('/perfil', null)

    expect(
      screen.getByRole('heading', { name: 'Entrar no FinaMEI' }),
    ).toBeInTheDocument()
  })

  it('mostra o painel com a navegação principal para quem está logado', () => {
    renderApp('/', { token: 'token', user: null })

    expect(
      screen.getByRole('heading', { name: 'Painel financeiro' }),
    ).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    expect(within(nav).getByRole('link', { name: 'Painel' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      within(nav).getByRole('link', { name: 'Lançamentos' }),
    ).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'DAS' })).toBeInTheDocument()
    expect(
      within(nav).getByRole('link', { name: 'Meu perfil' }),
    ).toBeInTheDocument()
  })

  it('navega entre as telas pelo menu', async () => {
    const user = userEvent.setup()
    renderApp('/painel', { token: 'token', user: null })

    await user.click(screen.getByRole('link', { name: 'Lançamentos' }))

    expect(
      screen.getByRole('heading', { name: 'Lançamentos' }),
    ).toBeInTheDocument()
  })

  it('ao sair, encerra a sessão e volta para o login', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: 'token', user: null }),
    )
    renderApp('/painel')

    await user.click(screen.getByRole('button', { name: 'Sair' }))

    expect(
      screen.getByRole('heading', { name: 'Entrar no FinaMEI' }),
    ).toBeInTheDocument()
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it('descarta uma sessão salva que já expirou', () => {
    sessionStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: 'token', user: null, expiresAt: Date.now() - 1 }),
    )
    renderApp('/painel')

    expect(
      screen.getByRole('heading', { name: 'Entrar no FinaMEI' }),
    ).toBeInTheDocument()
  })

  it('volta para o login quando o token expira durante o uso', () => {
    vi.useFakeTimers()
    renderApp('/painel', {
      token: 'token',
      user: null,
      expiresAt: Date.now() + 60_000,
    })
    expect(
      screen.getByRole('heading', { name: 'Painel financeiro' }),
    ).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(
      screen.getByRole('heading', { name: 'Entrar no FinaMEI' }),
    ).toBeInTheDocument()
  })
})
