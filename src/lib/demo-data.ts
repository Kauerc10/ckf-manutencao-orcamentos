import { DEFAULT_VALIDADE_DIAS } from './constants'
import type { Orcamento, Profile } from '../types'

export const DEMO_PROFILE: Profile = {
  id: 'demo-user',
  nome: 'Equipe CKF',
  email: 'demo@ckfmanutencao.local',
  ativo: true,
  role: 'admin',
  criadoEm: new Date().toISOString(),
}

export const DEMO_ORCAMENTOS: Orcamento[] = [
  {
    id: 'demo-1',
    numero: 285,
    dataOrcamento: '2026-05-16',
    servicoCliente: 'Filial São José',
    status: 'enviado',
    observacoes: 'Executar serviço em horário comercial.',
    validadeDias: DEFAULT_VALIDADE_DIAS,
    total: 500,
    criadoPor: DEMO_PROFILE.id,
    criadoPorNome: DEMO_PROFILE.nome,
    criadoEm: '2026-05-16T12:00:00Z',
    atualizadoEm: '2026-05-16T12:00:00Z',
    itens: [
      {
        id: 'demo-i1',
        quantidade: 2,
        descricao: 'Trocar parafusos quebrados, acabamento e pintura',
        valorUnitario: 250,
        valorTotal: 500,
      },
    ],
  },
  {
    id: 'demo-2',
    numero: 286,
    dataOrcamento: '2026-05-14',
    servicoCliente: 'Manutenção preventiva - Blumenau',
    status: 'aprovado',
    observacoes: '',
    validadeDias: DEFAULT_VALIDADE_DIAS,
    total: 980,
    criadoPor: DEMO_PROFILE.id,
    criadoPorNome: DEMO_PROFILE.nome,
    criadoEm: '2026-05-14T13:00:00Z',
    atualizadoEm: '2026-05-15T09:00:00Z',
    itens: [
      {
        id: 'demo-i2',
        quantidade: 1,
        descricao: 'Revisão mecânica completa',
        valorUnitario: 980,
        valorTotal: 980,
      },
    ],
  },
]
