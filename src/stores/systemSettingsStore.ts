import { create } from 'zustand'
import { getSystemSettings, saveSystemSettings } from '../data/systemSettingsRepository'
import { DEFAULT_SYSTEM_SETTINGS } from '../lib/constants'
import type { Profile, SystemSettings } from '../types'

type SystemSettingsState = {
  settings: SystemSettings
  loading: boolean
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  save: (settings: SystemSettings, profile: Profile) => Promise<void>
}

export const useSystemSettingsStore = create<SystemSettingsState>((set) => ({
  settings: DEFAULT_SYSTEM_SETTINGS,
  loading: false,
  loaded: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null })
    try {
      const settings = await getSystemSettings()
      set({ settings, loading: false, loaded: true })
    } catch (err) {
      set({
        settings: DEFAULT_SYSTEM_SETTINGS,
        loading: false,
        loaded: true,
        error: err instanceof Error ? err.message : 'Não foi possível carregar as configurações.',
      })
    }
  },
  save: async (settings, profile) => {
    set({ loading: true, error: null })
    try {
      const saved = await saveSystemSettings(settings, profile)
      set({ settings: saved, loading: false, loaded: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar as configurações.'
      set({ loading: false, error: message })
      throw new Error(message)
    }
  },
}))
