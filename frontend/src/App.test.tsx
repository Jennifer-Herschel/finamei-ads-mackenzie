import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'
import { AuthProvider } from './features/auth/AuthProvider'

describe('App', () => {
  it('renderiza a página de login', () => {
    render(
      <AuthProvider initialSession={null}>
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(
      screen.getByRole('heading', { name: 'Entrar no FinaMEI' }),
    ).toBeInTheDocument()
  })

  it('redireciona para o login ao acessar o perfil sem sessão', () => {
    render(
      <AuthProvider initialSession={null}>
        <MemoryRouter initialEntries={['/perfil']}>
          <App />
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(
      screen.getByRole('heading', { name: 'Entrar no FinaMEI' }),
    ).toBeInTheDocument()
  })
})
