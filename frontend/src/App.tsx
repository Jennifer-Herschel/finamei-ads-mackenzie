import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './app/AppLayout'
import { LoginPage } from './features/auth/LoginPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { ProfilePage } from './features/profile/ProfilePage'

const pages = {
  painel: {
    title: 'Painel financeiro',
    description: 'Resumo de saldo, receitas, despesas e faturamento anual.',
  },
  lancamentos: {
    title: 'Lançamentos',
    description: 'Registre e acompanhe as movimentações do seu negócio.',
  },
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

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/painel" replace />} />
        <Route path="/painel" element={<PlaceholderPage {...pages.painel} />} />
        <Route
          path="/lancamentos"
          element={<PlaceholderPage {...pages.lancamentos} />}
        />
        <Route path="/das" element={<PlaceholderPage {...pages.das} />} />
        <Route path="/perfil" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
