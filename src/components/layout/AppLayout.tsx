import { FileClock, LayoutDashboard, LogOut, Plus, Wrench } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { EMPRESA } from '../../lib/constants'
import { useAuthStore } from '../../stores/authStore'

type Props = {
  children: ReactNode
}

export function AppLayout({ children }: Props) {
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const mode = useAuthStore((state) => state.mode)
  const logout = useAuthStore((state) => state.logout)

  async function handleLogout() {
    await logout()
    toast.success('Sessão encerrada.')
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            <Wrench size={22} />
          </div>
          <div>
            <strong>CKF Sistema</strong>
            <span>{EMPRESA.nome}</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Principal">
          <NavLink to="/" end>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
          <NavLink to="/orcamentos/novo">
            <Plus size={18} />
            Novo orçamento
          </NavLink>
          <NavLink to="/historico">
            <FileClock size={18} />
            Histórico
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <strong>{profile?.nome}</strong>
            <span>{profile?.email}</span>
            {mode === 'local' ? <em>Modo local sem Supabase</em> : null}
          </div>
          <button className="sidebar-logout" type="button" onClick={handleLogout}>
            <LogOut size={17} />
            Sair
          </button>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div>
            <span className="eyebrow">Sistema interno</span>
            <h1>Orçamentos CK Manutenção</h1>
          </div>
          <button className="primary-button" type="button" onClick={() => navigate('/orcamentos/novo')}>
            <Plus size={18} />
            Novo orçamento
          </button>
        </header>
        {children}
      </main>
    </div>
  )
}
