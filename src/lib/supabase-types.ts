import type { ClienteTipo, OrcamentoStatus } from '../types'

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
      clientes: {
        Row: {
          id: string
          tipo: ClienteTipo
          nome: string
          documento: string
          nome_fantasia: string
          email: string
          telefone_principal: string
          telefone_alternativo: string
          inscricao_estadual: string
          cep: string
          logradouro: string
          numero: string
          complemento: string
          bairro: string
          cidade: string
          uf: string
          referencia_acesso: string
          observacoes: string
          tags: string[]
          ativo: boolean
          criado_por: string
          atualizado_por: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          tipo: ClienteTipo
          nome: string
          documento: string
          telefone_principal: string
          cep: string
          logradouro: string
          numero: string
          bairro: string
          cidade: string
          uf: string
          criado_por: string
          nome_fantasia?: string
          email?: string
          telefone_alternativo?: string
          inscricao_estadual?: string
          complemento?: string
          referencia_acesso?: string
          observacoes?: string
          tags?: string[]
          ativo?: boolean
          atualizado_por?: string | null
        }
        Update: {
          tipo?: ClienteTipo
          nome?: string
          documento?: string
          nome_fantasia?: string
          email?: string
          telefone_principal?: string
          telefone_alternativo?: string
          inscricao_estadual?: string
          cep?: string
          logradouro?: string
          numero?: string
          complemento?: string
          bairro?: string
          cidade?: string
          uf?: string
          referencia_acesso?: string
          observacoes?: string
          tags?: string[]
          ativo?: boolean
          atualizado_por?: string | null
        }
      }
      cliente_representantes: {
        Row: {
          id: string
          cliente_id: string
          nome: string
          cargo: string
          telefone: string
          email: string
          observacao: string
          principal: boolean
          ativo: boolean
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          cliente_id: string
          nome: string
          cargo: string
          telefone: string
          email?: string
          observacao?: string
          principal?: boolean
          ativo?: boolean
        }
        Update: {
          nome?: string
          cargo?: string
          telefone?: string
          email?: string
          observacao?: string
          principal?: boolean
          ativo?: boolean
        }
      }
      activity_logs: {
        Row: {
          id: string
          entity_type: 'cliente' | 'cliente_representante' | 'orcamento'
          entity_id: string
          action: string
          actor_id: string | null
          details: Json
          criado_em: string
        }
        Insert: never
        Update: never
      }
      orcamentos: {
        Row: {
          id: string
          numero: number
          data_orcamento: string
          servico_cliente: string
          cliente_id: string | null
          representante_id: string | null
          status: OrcamentoStatus
          observacoes: string
          validade_dias: number
          total: number
          criado_por: string
          atualizado_por: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          data_orcamento: string
          servico_cliente: string
          cliente_id?: string | null
          representante_id?: string | null
          status?: OrcamentoStatus
          observacoes?: string
          validade_dias?: number
          total: number
          criado_por: string
          atualizado_por?: string | null
        }
        Update: {
          data_orcamento?: string
          servico_cliente?: string
          cliente_id?: string | null
          representante_id?: string | null
          status?: OrcamentoStatus
          observacoes?: string
          validade_dias?: number
          total?: number
          atualizado_por?: string | null
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
