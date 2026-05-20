import type { OrcamentoStatus } from '../types'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nome: string
          email: string
          ativo: boolean
          role: 'admin' | 'usuario'
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id: string
          nome: string
          email: string
          ativo?: boolean
          role?: 'admin' | 'usuario'
        }
        Update: {
          nome?: string
          email?: string
          ativo?: boolean
          role?: 'admin' | 'usuario'
        }
      }
      system_settings: {
        Row: {
          id: 'default'
          empresa_nome: string
          empresa_email: string
          empresa_cnpj: string
          empresa_telefone: string
          empresa_regiao: string
          orcamento_validade_padrao: number
          orcamento_observacoes_padrao: string
          preview_densidade: 'compacta' | 'confortavel'
          mostrar_logo_documentos: boolean
          criado_em: string
          atualizado_em: string
          atualizado_por: string | null
        }
        Insert: {
          id?: 'default'
          empresa_nome?: string
          empresa_email?: string
          empresa_cnpj?: string
          empresa_telefone?: string
          empresa_regiao?: string
          orcamento_validade_padrao?: number
          orcamento_observacoes_padrao?: string
          preview_densidade?: 'compacta' | 'confortavel'
          mostrar_logo_documentos?: boolean
          atualizado_por?: string | null
        }
        Update: {
          empresa_nome?: string
          empresa_email?: string
          empresa_cnpj?: string
          empresa_telefone?: string
          empresa_regiao?: string
          orcamento_validade_padrao?: number
          orcamento_observacoes_padrao?: string
          preview_densidade?: 'compacta' | 'confortavel'
          mostrar_logo_documentos?: boolean
          atualizado_por?: string | null
        }
      }
      orcamentos: {
        Row: {
          id: string
          numero: number
          data_orcamento: string
          servico_cliente: string
          status: OrcamentoStatus
          observacoes: string
          validade_dias: number
          total: number
          criado_por: string
          criado_em: string
          atualizado_em: string
          excluido_em: string | null
          excluido_por: string | null
          exclusao_solicitada_por: string | null
          excluido_motivo: string | null
        }
        Insert: {
          data_orcamento: string
          servico_cliente: string
          status?: OrcamentoStatus
          observacoes?: string
          validade_dias?: number
          total: number
          excluido_em?: string | null
          excluido_por?: string | null
          exclusao_solicitada_por?: string | null
          excluido_motivo?: string | null
        }
        Update: {
          data_orcamento?: string
          servico_cliente?: string
          status?: OrcamentoStatus
          observacoes?: string
          validade_dias?: number
          total?: number
          excluido_em?: string | null
          excluido_por?: string | null
          exclusao_solicitada_por?: string | null
          excluido_motivo?: string | null
        }
      }
      orcamento_itens: {
        Row: {
          id: string
          orcamento_id: string
          ordem: number
          quantidade: number | null
          descricao: string
          valor_unitario: number | null
          valor_total: number
          criado_em: string
        }
        Insert: {
          orcamento_id: string
          ordem: number
          quantidade?: number | null
          descricao: string
          valor_unitario?: number | null
          valor_total: number
        }
        Update: {
          ordem?: number
          quantidade?: number | null
          descricao?: string
          valor_unitario?: number | null
          valor_total?: number
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      orcamento_status: OrcamentoStatus
    }
    CompositeTypes: Record<string, never>
  }
}
