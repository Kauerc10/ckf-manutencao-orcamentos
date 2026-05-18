import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppLayout } from './components/layout/AppLayout'
import { useAuthStore } from './stores/authStore'
import { useSystemSettingsStore } from './stores/systemSettingsStore'
import { ClienteDetalhe } from './pages/ClienteDetalhe'
import { ClienteFormPage } from './pages/ClienteFormPage'
import { Clientes } from './pages/Clientes'
import { Configuracoes } from './pages/Configuracoes'
import { Dashboard } from './pages/Dashboard'
import { EditarOrcamento } from './pages/EditarOrcamento'
import { Historico } from './pages/Historico'
import { Login } from './pages/Login'
import { NovoOrcamento } from './pages/NovoOrcamento'
import { VisualizarOrcamento } from './pages/VisualizarOrcamento'

function ProtectedApp() {
  const profile = useAuthStore((state) => state.profile)
  const loading = useAuthStore((state) => state.loading)
  const loadSettings = useSystemSettingsStore((state) => state.load)

  useEffect(() => {
    if (profile) void loadSettings()
  }, [loadSettings, profile])

  if (loading) {
    return <div className="full-page-state">Carregando CKF Sistema...</div>
  }

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/novo" element={<ClienteFormPage />} />
        <Route path="/clientes/:id" element={<ClienteDetalhe />} />
        <Route path="/clientes/:id/editar" element={<ClienteFormPage />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/orcamentos/novo" element={<NovoOrcamento />} />
        <Route path="/orcamentos/:id" element={<VisualizarOrcamento />} />
        <Route path="/orcamentos/:id/editar" element={<EditarOrcamento />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<ProtectedApp />} />
      </Routes>
      <Toaster richColors position="top-right" closeButton />
    </>
  )
}
