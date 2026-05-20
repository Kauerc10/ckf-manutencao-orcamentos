import { describe, expect, it } from 'vitest'
import type { Cliente } from '../types'
import {
  normalizeSearchText,
  normalizeSearchDigits,
  getClienteSearchText,
  searchClientes,
  getActiveRepresentantes,
  getPrincipalRepresentante,
} from './cliente-search'

const mockClientes: Cliente[] = [
  {
    id: '1',
    tipo: 'cnpj',
    nome: 'Kauerc Inc',
    nomeFantasia: 'A Garoto Inc',
    documento: '12.345.678/0001-90',
    rg: '',
    email: 'contact@kauerc.com',
    telefonePrincipal: '(11) 98765-4321',
    telefoneAlternativo: '',
    inscricaoEstadual: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: 'São Paulo',
    uf: 'SP',
    referenciaAcesso: '',
    observacoes: 'Cliente vip',
    tags: ['vip', 'premium'],
    ativo: true,
    criadoPor: 'user',
    criadoPorNome: 'User',
    atualizadoPor: null,
    criadoEm: '',
    atualizadoEm: '',
    representantes: [
      {
        id: 'r1',
        nome: 'Kauerc Silva',
        cargo: 'CEO',
        telefone: '11988887777',
        email: 'ceo@kauerc.com',
        observacao: '',
        principal: true,
        ativo: true,
      },
      {
        id: 'r2',
        nome: 'Marcos Inativo',
        cargo: 'Gerente',
        telefone: '11999998888',
        email: 'marcos@kauerc.com',
        observacao: '',
        principal: false,
        ativo: false,
      },
    ],
  },
  {
    id: '2',
    tipo: 'cpf',
    nome: 'Maria da Silva',
    nomeFantasia: '',
    documento: '111.222.333-44',
    rg: '',
    email: 'maria@gmail.com',
    telefonePrincipal: '21999998888',
    telefoneAlternativo: '',
    inscricaoEstadual: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: 'Rio de Janeiro',
    uf: 'RJ',
    referenciaAcesso: '',
    observacoes: '',
    tags: ['varejo'],
    ativo: true,
    criadoPor: 'user',
    criadoPorNome: 'User',
    atualizadoPor: null,
    criadoEm: '',
    atualizadoEm: '',
    representantes: [],
  },
  {
    id: '3',
    tipo: 'cnpj',
    nome: 'Outra Empresa LTDA',
    nomeFantasia: 'Kauerc Filial',
    documento: '98.765.432/0001-21',
    rg: '',
    email: '',
    telefonePrincipal: '',
    telefoneAlternativo: '',
    inscricaoEstadual: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: 'Belo Horizonte',
    uf: 'MG',
    referenciaAcesso: '',
    observacoes: '',
    tags: ['importante'],
    ativo: false, // Inactive client
    criadoPor: 'user',
    criadoPorNome: 'User',
    atualizadoPor: null,
    criadoEm: '',
    atualizadoEm: '',
    representantes: [],
  },
]

describe('cliente-search utilities', () => {
  it('should normalize search text by converting to lowercase and stripping accents', () => {
    expect(normalizeSearchText('São Paulo - Ceará')).toBe('sao paulo - ceara')
    expect(normalizeSearchText('   ')).toBe('')
  })

  it('should extract digits correctly', () => {
    expect(normalizeSearchDigits('12.345-678/90')).toBe('1234567890')
    expect(normalizeSearchDigits('abc')).toBe('')
  })

  it('should index searchable properties into a string', () => {
    const indexed = getClienteSearchText(mockClientes[0])
    expect(indexed).toContain('kauerc inc')
    expect(indexed).toContain('a garoto inc')
    expect(indexed).toContain('sao paulo')
    expect(indexed).toContain('sp')
    expect(indexed).toContain('vip')
    expect(indexed).toContain('premium')
    expect(indexed).toContain('kauerc silva')
    expect(indexed).toContain('ceo')
  })

  it('should search active clients, respect the limit, and score/rank matches', () => {
    // Empty search should return all active clients up to limit
    const emptySearch = searchClientes(mockClientes, '', 1)
    expect(emptySearch).toHaveLength(1)
    expect(emptySearch[0].id).toBe('1') // "Kauerc Inc" is active

    // Inactive clients should never be returned
    const inactiveSearch = searchClientes(mockClientes, 'Outra')
    expect(inactiveSearch).toHaveLength(0)

    // Ranking test: query "Kauerc"
    // ID 1: Name contains "Kauerc Inc" (score += 1000 for startsWith), Fantasia contains "Kauerc" (score += 300)
    // ID 3: Inactive, not returned.
    const resultRank = searchClientes(mockClientes, 'Kauerc')
    expect(resultRank).toHaveLength(1)
    expect(resultRank[0].id).toBe('1')

    // Searching by document or phone
    const docSearch = searchClientes(mockClientes, '12345678000190')
    expect(docSearch).toHaveLength(1)
    expect(docSearch[0].id).toBe('1')

    const phoneSearch = searchClientes(mockClientes, '987654321')
    expect(phoneSearch).toHaveLength(1)
    expect(phoneSearch[0].id).toBe('1')
  })

  it('should extract active representatives', () => {
    const activeReps = getActiveRepresentantes(mockClientes[0])
    expect(activeReps).toHaveLength(1)
    expect(activeReps[0].id).toBe('r1')
    expect(activeReps[0].ativo).toBe(true)
  })

  it('should select principal active representative or fallback to first active', () => {
    const principal = getPrincipalRepresentante(mockClientes[0])
    expect(principal?.id).toBe('r1')

    const emptyReps = getPrincipalRepresentante(mockClientes[1])
    expect(emptyReps).toBeNull()
  })
})
