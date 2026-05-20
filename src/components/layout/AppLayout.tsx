import { FileClock, LayoutDashboard, LogOut, Menu, Plus, Settings, Users, X } from 'lucide-react'
import { type ReactNode, useCallback, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BRAND_ASSETS } from '../../lib/constants'
import { useAuthStore } from '../../stores/authStore'

type Props = {
  children: ReactNode
}

export function AppLayout({ children }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = useAuthStore((state) => state.profile)
  const mode = useAuthStore((state) => state.mode)
  const logout = useAuthStore((state) => state.logout)
  const [drawerState, setDrawerState] = useState({ open: false, pathname: location.pathname })
  const drawerOpen = drawerState.open && drawerState.pathname === location.pathname

  const closeDrawer = useCallback(() => setDrawerState((current) => ({ ...current, open: false })), [])
  const openDrawer = useCallback(() => setDrawerState({ open: true, pathname: location.pathname }), [location.pathname])

  async function handleLogout() {
    await logout()
    toast.success('Sessão encerrada.')
    navigate('/login')
  }

  return (
    <div className="app-shell">
      {/* ── Desktop sidebar (hidden on mobile via CSS) ── */}
      <aside className="sidebar desktop-only">
        <div className="brand-block">
          <img className="sidebar-logo" src={BRAND_ASSETS.symbolWhiteAmberPng} alt="CKF Manutenção" />
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
          <NavLink to="/clientes">
            <Users size={18} />
            Clientes
          </NavLink>
          <NavLink to="/historico">
            <FileClock size={18} />
            Histórico
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <nav className="sidebar-nav sidebar-nav-secondary" aria-label="Sistema">
            <NavLink to="/configuracoes">
              <Settings size={18} />
              Configurações
            </NavLink>
          </nav>
          <div className="user-card">
            <strong>{profile?.nome}</strong>
            <span>{profile?.email}</span>
            {profile?.role === 'admin' ? <em>Administrador</em> : null}
            {mode === 'local' ? <em>Modo local sem Supabase</em> : null}
          </div>
          <button className="sidebar-logout" type="button" onClick={handleLogout}>
            <LogOut size={17} />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Mobile header (hidden on desktop via CSS) ── */}
      <header className="mobile-header mobile-only">
        <button className="mobile-menu-btn" type="button" onClick={openDrawer} aria-label="Abrir menu">
          <Menu size={22} />
        </button>
        <div className="mobile-brand">
          <img className="mobile-logo" src={BRAND_ASSETS.symbolWhiteAmberPng} alt="CKF" />
        </div>
        <div className="mobile-header-spacer" />
      </header>

      {/* ── Mobile drawer (user info + logout) ── */}
      {drawerOpen ? (
        <div className="drawer-backdrop mobile-only" onClick={closeDrawer} role="presentation">
          <aside className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top">
              <div className="brand-block">
                <img className="sidebar-logo drawer-logo" src={BRAND_ASSETS.symbolWhiteAmberPng} alt="CKF Manutenção" />
              </div>
              <button className="mobile-menu-btn" type="button" onClick={closeDrawer} aria-label="Fechar menu">
                <X size={22} />
              </button>
            </div>

            <nav className="drawer-nav" aria-label="Menu mobile">
              <NavLink to="/" end>
                <LayoutDashboard size={18} />
                Dashboard
              </NavLink>
              <NavLink to="/orcamentos/novo">
                <Plus size={18} />
                Novo orçamento
              </NavLink>
              <NavLink to="/clientes">
                <Users size={18} />
                Clientes
              </NavLink>
              <NavLink to="/historico">
                <FileClock size={18} />
                Histórico
              </NavLink>
            </nav>

            <div className="drawer-footer">
              <nav className="drawer-nav drawer-nav-secondary" aria-label="Sistema mobile">
                <NavLink to="/configuracoes">
                  <Settings size={18} />
                  Configurações
                </NavLink>
              </nav>
              <div className="user-card">
                <strong>{profile?.nome}</strong>
                <span>{profile?.email}</span>
                {profile?.role === 'admin' ? <em>Administrador</em> : null}
                {mode === 'local' ? <em>Modo local sem Supabase</em> : null}
              </div>
              <button className="sidebar-logout" type="button" onClick={handleLogout}>
                <LogOut size={17} />
                Sair
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {/* ── Main content ── */}
      <main className="main-shell">
        <header className="topbar">
          <div>
            <span className="eyebrow">Sistema interno</span>
            <h1>Orçamentos CKF Manutenção</h1>
          </div>
          <button className="primary-button desktop-only" type="button" onClick={() => navigate('/orcamentos/novo')}>
            <Plus size={18} />
            Novo orçamento
          </button>
        </header>
        {children}
      </main>

      {/* ── Mobile bottom navigation (hidden on desktop via CSS) ── */}
      <nav className="mobile-bottom-nav mobile-only" aria-label="Navegação rápida">
        <NavLink to="/" end className="bottom-nav-item">
          <LayoutDashboard size={20} />
          <span>Início</span>
        </NavLink>
        <NavLink to="/orcamentos/novo" className="bottom-nav-item">
          <Plus size={20} />
          <span>Novo</span>
        </NavLink>
        <NavLink to="/clientes" className="bottom-nav-item">
          <Users size={20} />
          <span>Clientes</span>
        </NavLink>
        <NavLink to="/historico" className="bottom-nav-item">
          <FileClock size={20} />
          <span>Histórico</span>
        </NavLink>
      </nav>
    </div>
  )
}
