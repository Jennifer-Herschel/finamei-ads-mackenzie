import { useQueryClient } from '@tanstack/react-query'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'

const meiNavItems = [
  { to: '/painel', label: 'Painel' },
  { to: '/lancamentos', label: 'Lançamentos' },
  { to: '/das', label: 'DAS' },
  { to: '/relatorios', label: 'Relatórios' },
  { to: '/categorias', label: 'Categorias' },
  { to: '/perfil', label: 'Meu perfil' },
]

// The accountant only reads client data (OF17, RN11).
const accountantNavItems = [
  { to: '/clientes', label: 'Meus clientes' },
  { to: '/perfil', label: 'Meu perfil' },
]

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'

/** Shell shared by every authenticated screen: header, navigation and sign out. */
export function AppLayout() {
  const { user, role, signOut } = useAuth()
  const navItems = role === 'ACCOUNTANT' ? accountantNavItems : meiNavItems
  const queryClient = useQueryClient()

  const handleSignOut = () => {
    // Drop cached data so the next user never sees the previous one's data.
    queryClient.clear()
    signOut()
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link
            to="/"
            className={`rounded text-lg font-bold text-emerald-700 ${focusRing}`}
          >
            FinaMEI
          </Link>

          <div className="flex items-center gap-3">
            {user?.name && (
              <span className="hidden text-sm text-slate-600 sm:inline">
                Olá, {user.name}
              </span>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className={`rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 ${focusRing}`}
            >
              Sair
            </button>
          </div>

          <nav aria-label="Navegação principal" className="w-full">
            <ul className="-mx-1 flex flex-wrap gap-1 pb-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-2 text-sm font-medium ${focusRing} ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <Outlet />
    </div>
  )
}
