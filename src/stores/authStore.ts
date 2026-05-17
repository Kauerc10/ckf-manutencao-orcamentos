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
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
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

      const profile = await loadSupabaseProfile(user.id)
      set({ profile, loading: false, mode: 'supabase' })
      return
    }

    const raw = localStorage.getItem(DEMO_AUTH_KEY)
    set({ profile: raw ? (JSON.parse(raw) as Profile) : null, loading: false, mode: 'local' })
  },
  login: async (email, password) => {
    set({ loading: true })

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        set({ loading: false })
        throw error
      }
      if (!data.user) {
        set({ loading: false })
        throw new Error('Usuário não retornado pelo Supabase.')
      }
      const profile = await loadSupabaseProfile(data.user.id)
      set({ profile, loading: false, mode: 'supabase' })
      return
    }

    const profile = { ...DEMO_PROFILE, email: email || DEMO_PROFILE.email }
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
