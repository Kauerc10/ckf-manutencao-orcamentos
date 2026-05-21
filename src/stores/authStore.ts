import { create } from 'zustand'
import { DEMO_PROFILE } from '../lib/demo-data'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Profile } from '../types'

const DEMO_AUTH_KEY = 'ckf-demo-profile'

type AuthState = {
  profile: Profile | null
  loading: boolean
  mode: 'supabase' | 'local'
  bootstrap: () => Promise<void>
  login: (identifier: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

async function resolveEmail(identifier: string): Promise<string> {
  if (identifier.includes('@')) return identifier
  if (!supabase) throw new Error('Supabase não configurado.')

  const { data, error } = await supabase.rpc('get_email_by_username', {
    p_username: identifier,
  })
  
  if (error) throw new Error('Erro ao buscar usuário.')
  if (!data) throw new Error('Usuário não encontrado.')
  
  return data as string
}

async function loadSupabaseProfile(userId: string): Promise<Profile> {
  if (!supabase) throw new Error('Supabase não configurado.')

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  if (!data.ativo) throw new Error('Usuário inativo. Fale com o administrador.')

  return {
    id: data.id,
    nome: data.nome,
    email: data.email,
    ativo: data.ativo,
    role: data.role ?? 'usuario',
    criadoEm: data.criado_em,
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  loading: true,
  mode: isSupabaseConfigured ? 'supabase' : 'local',
  bootstrap: async () => {
    set({ loading: true })

    if (isSupabaseConfigured && supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        set({ profile: null, loading: false, mode: 'supabase' })
        return
      }

      try {
        const profile = await loadSupabaseProfile(user.id)
        set({ profile, loading: false, mode: 'supabase' })
      } catch {
        await supabase.auth.signOut()
        set({ profile: null, loading: false, mode: 'supabase' })
      }
      return
    }

    const raw = localStorage.getItem(DEMO_AUTH_KEY)
    set({ profile: raw ? (JSON.parse(raw) as Profile) : null, loading: false, mode: 'local' })
  },
  login: async (identifier, password) => {
    set({ loading: true })

    if (isSupabaseConfigured && supabase) {
      try {
        const email = await resolveEmail(identifier)
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          set({ loading: false })
          throw error
        }
        if (!data.user) {
          set({ loading: false })
          throw new Error('Usuário não retornado pelo Supabase.')
        }
        try {
          const profile = await loadSupabaseProfile(data.user.id)
          set({ profile, loading: false, mode: 'supabase' })
          return
        } catch (profileError) {
          await supabase.auth.signOut()
          throw profileError
        }
      } catch (error) {
        set({ loading: false })
        throw error
      }
    }

    const email = identifier.includes('@') ? identifier : DEMO_PROFILE.email
    const profile = { ...DEMO_PROFILE, email }
    localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(profile))
    set({ profile, loading: false, mode: 'local' })
  },
  logout: async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
    } else {
      localStorage.removeItem(DEMO_AUTH_KEY)
    }

    set({ profile: null, loading: false })
  },
}))
