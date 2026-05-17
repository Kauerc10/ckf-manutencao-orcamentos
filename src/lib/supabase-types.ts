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
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id: string
          nome: string
          email: string
          ativo?: boolean
        }
        Update: {
          nome?: string
          email?: string
          ativo?: boolean
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
        }
        Insert: {
          data_orcamento: string
          servico_cliente: string
          status?: OrcamentoStatus
          observacoes?: string
          validade_dias?: number
          total: number
          criado_por: string
        }
        Update: {
          data_orcamento?: string
          servico_cliente?: string
          status?: OrcamentoStatus
          observacoes?: string
          validade_dias?: number
          total?: number
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
