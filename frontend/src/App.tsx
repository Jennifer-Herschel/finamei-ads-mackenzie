import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppLayout } from './app/AppLayout'
import { LoginPage } from './features/auth/LoginPage'
import { ClientReportsPage } from './features/accountant/ClientReportsPage'
import { ClientsPage } from './features/accountant/ClientsPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { HomeRedirect, RequireRole } from './features/auth/role-routes'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { ReportsPage } from './features/report/ReportsPage'
import { TransactionsPage } from './features/transaction/TransactionsPage'

const pages = {
  das: {
    title: 'Controle do DAS',
    description: 'Consulte as guias mensais e mantenha os pagamentos em dia.',
  },
}

type PageProps = (typeof pages)[keyof typeof pages]

function PlaceholderPage({ title, description }: PageProps) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="w-full rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-slate-600">{description}</p>
        <p className="mt-8 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Estrutura inicial pronta para a implementação desta funcionalidade.
        </p>
      </section>
    </main>
  )
}

// Admin screens are not built yet; admins get the MEI screens for now.
const MEI_ROLES = ['MEI', 'ADMIN'] as const
const ACCOUNTANT_ONLY = ['ACCOUNTANT'] as const

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomeRedirect />} />
        <Route
          element={
            <RequireRole roles={MEI_ROLES}>
              <Outlet />
            </RequireRole>
          }
        >
          <Route path="/painel" element={<DashboardPage />} />
          <Route path="/lancamentos" element={<TransactionsPage />} />
          <Route path="/das" element={<PlaceholderPage {...pages.das} />} />
          <Route path="/relatorios" element={<ReportsPage />} />
        </Route>
        <Route
          element={
            <RequireRole roles={ACCOUNTANT_ONLY}>
              <Outlet />
            </RequireRole>
          }
        >
          <Route path="/clientes" element={<ClientsPage />} />
          <Route
            path="/clientes/:clientId/relatorios"
            element={<ClientReportsPage />}
          />
        </Route>
        <Route path="/perfil" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
