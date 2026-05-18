import { DEFAULT_SYSTEM_SETTINGS } from '../lib/constants'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Profile, SystemSettings } from '../types'

const STORAGE_KEY = 'ckf-system-settings-v1'

type SystemSettingsRow = {
  id: 'default'
  empresa_nome: string
  empresa_email: string
  empresa_cnpj: string
  empresa_telefone: string
  empresa_regiao: string
  orcamento_validade_padrao: number
  orcamento_observacoes_padrao: string
  preview_densidade: SystemSettings['previewDensidade']
  mostrar_logo_documentos: boolean
  atualizado_em: string | null
  atualizado_por: string | null
}

function withDefaults(settings: Partial<SystemSettings> | null | undefined): SystemSettings {
  return {
    ...DEFAULT_SYSTEM_SETTINGS,
    ...settings,
    id: 'default',
    empresa: {
      ...DEFAULT_SYSTEM_SETTINGS.empresa,
      ...settings?.empresa,
    },
  }
}

function mapRow(row: SystemSettingsRow): SystemSettings {
  return withDefaults({
    id: 'default',
    empresa: {
      nome: row.empresa_nome,
      email: row.empresa_email,
      cnpj: row.empresa_cnpj,
      telefone: row.empresa_telefone,
      regiao: row.empresa_regiao,
    },
    validadePadraoDias: Number(row.orcamento_validade_padrao),
    observacoesPadrao: row.orcamento_observacoes_padrao ?? '',
    previewDensidade: row.preview_densidade,
    mostrarLogoDocumentos: row.mostrar_logo_documentos,
    atualizadoEm: row.atualizado_em,
    atualizadoPor: row.atualizado_por,
  })
}

function toRow(settings: SystemSettings, profile: Profile) {
  return {
    empresa_nome: settings.empresa.nome,
    empresa_email: settings.empresa.email,
    empresa_cnpj: settings.empresa.cnpj,
    empresa_telefone: settings.empresa.telefone,
    empresa_regiao: settings.empresa.regiao,
    orcamento_validade_padrao: settings.validadePadraoDias,
    orcamento_observacoes_padrao: settings.observacoesPadrao,
    preview_densidade: settings.previewDensidade,
    mostrar_logo_documentos: settings.mostrarLogoDocumentos,
    atualizado_por: profile.id,
  }
}

function readLocal(): SystemSettings {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_SYSTEM_SETTINGS

  try {
    return withDefaults(JSON.parse(raw) as Partial<SystemSettings>)
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return DEFAULT_SYSTEM_SETTINGS
  }
}

function writeLocal(settings: SystemSettings): SystemSettings {
  const next = withDefaults({
    ...settings,
    atualizadoEm: new Date().toISOString(),
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export async function getSystemSettings(): Promise<SystemSettings> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('system_settings').select('*').eq('id', 'default').maybeSingle()
    if (error) throw error
    return data ? mapRow(data as SystemSettingsRow) : DEFAULT_SYSTEM_SETTINGS
  }

  return readLocal()
}

export async function saveSystemSettings(settings: SystemSettings, profile: Profile): Promise<SystemSettings> {
  if (profile.role !== 'admin') {
    throw new Error('Apenas administradores podem alterar configurações.')
  }

  const normalized = withDefaults(settings)

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('system_settings')
      .update(toRow(normalized, profile))
      .eq('id', 'default')
      .select('*')
      .single()

    if (error) throw error
    return mapRow(data as SystemSettingsRow)
  }

  return writeLocal({ ...normalized, atualizadoPor: profile.id })
}
