import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { EMPRESA } from '../lib/constants'
import { useAuthStore } from '../stores/authStore'

export function Login() {
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const loading = useAuthStore((state) => state.loading)
  const login = useAuthStore((state) => state.login)
  const mode = useAuthStore((state) => state.mode)
  const [email, setEmail] = useState(() => (mode === 'local' ? 'demo@ckmanutencao.local' : ''))
  const [password, setPassword] = useState(() => (mode === 'local' ? 'demo-local' : ''))

  if (profile) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await login(email, password)
      toast.success('Entrada confirmada.')
      navigate('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível entrar.')
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <div className="document-logo">CK</div>
          <h1>{EMPRESA.nome}</h1>
          <p>Sistema interno de orçamentos</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Senha
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {mode === 'local' ? (
            <p className="form-note">Supabase ainda não configurado. Este login abre o modo local de validação.</p>
          ) : null}
          <button className="primary-button full-width" disabled={loading} type="submit">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}
