import { describe, expect, it } from 'vitest'
import {
  applyClienteFilters,
  formatClienteDocumento,
  getClienteDisplayName,
  normalizeDocumento,
} from './clientes'
import { clienteFormSchema } from './validations'
import type { Cliente } from '../types'

const baseCliente: Cliente = {
  id: 'cliente-1',
  tipo: 'cnpj',
  nome: 'Condominio Centro Comercial',
  documento: '12345678000195',
  nomeFantasia: 'Centro Comercial',
  email: 'contato@centro.test',
  telefonePrincipal: '(47) 3333-4444',
  telefoneAlternativo: '',
  inscricaoEstadual: '',
  cep: '89010000',
  logradouro: 'Rua XV',
  numero: '120',
  complemento: 'Sala tecnica',
  bairro: 'Centro',
  cidade: 'Blumenau',
  uf: 'SC',
  referenciaAcesso: 'Entrada pela garagem',
  observacoes: '',
  tags: ['condominio'],
  ativo: true,
  criadoPor: 'user-1',
  criadoPorNome: 'Kauerc',
  atualizadoPor: 'user-1',
  criadoEm: '2026-05-18T10:00:00Z',
  atualizadoEm: '2026-05-18T10:00:00Z',
  representantes: [
    {
      id: 'rep-1',
      clienteId: 'cliente-1',
      nome: 'Marina Souza',
      cargo: 'Sindica',
      telefone: '(47) 99999-0000',
      email: 'marina@centro.test',
      observacao: '',
      principal: true,
      ativo: true,
      criadoEm: '2026-05-18T10:00:00Z',
      atualizadoEm: '2026-05-18T10:00:00Z',
    },
  ],
}

describe('clientes business rules', () => {
  it('normalizes and formats CPF/CNPJ documents', () => {
    expect(normalizeDocumento('111.444.777-35')).toBe('11144477735')
    expect(formatClienteDocumento('11144477735')).toBe('111.444.777-35')
    expect(formatClienteDocumento('57461028000143')).toBe('57.461.028/0001-43')
  })

  it('validates operational CPF and CNPJ records', () => {
    const cpfResult = clienteFormSchema.safeParse({
      tipo: 'cpf',
      nome: 'Joao Cliente',
      documento: '11144477735',
      telefonePrincipal: '(47) 98888-7777',
      cep: '89010000',
      logradouro: 'Rua Bahia',
      numero: '10',
      bairro: 'Escola Agricola',
      cidade: 'Blumenau',
      uf: 'SC',
      representantes: [],
    })

    const cnpjResult = clienteFormSchema.safeParse({
      tipo: 'cnpj',
      nome: 'Empresa Teste LTDA',
      documento: '57461028000143',
      telefonePrincipal: '(47) 3333-2222',
      cep: '89010000',
      logradouro: 'Rua Sao Paulo',
      numero: '455',
      bairro: 'Itoupava Seca',
      cidade: 'Blumenau',
      uf: 'SC',
      representantes: [{ nome: 'Ana Gestora', cargo: 'Gerente', telefone: '(47) 99999-1111', principal: true }],
    })

    expect(cpfResult.success).toBe(true)
    expect(cnpjResult.success).toBe(true)
  })

  it('requires a principal representative for CNPJ records', () => {
    const result = clienteFormSchema.safeParse({
      tipo: 'cnpj',
      nome: 'Empresa Sem Representante',
      documento: '57461028000143',
      telefonePrincipal: '(47) 3333-2222',
      cep: '89010000',
      logradouro: 'Rua Sao Paulo',
      numero: '455',
      bairro: 'Itoupava Seca',
      cidade: 'Blumenau',
      uf: 'SC',
      representantes: [{ nome: 'Ana Gestora', cargo: 'Gerente', telefone: '(47) 99999-1111', principal: false }],
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain('representantes')
  })

  it('filters by name, document, city and representative', () => {
    expect(applyClienteFilters([baseCliente], { search: 'marina', tipo: 'todos', status: 'ativos', cidadeUf: '' })).toHaveLength(1)
    expect(applyClienteFilters([baseCliente], { search: '12.345.678/0001-95', tipo: 'todos', status: 'ativos', cidadeUf: '' })).toHaveLength(1)
    expect(applyClienteFilters([baseCliente], { search: '', tipo: 'cnpj', status: 'ativos', cidadeUf: 'Blumenau/SC' })).toHaveLength(1)
    expect(applyClienteFilters([baseCliente], { search: '', tipo: 'cpf', status: 'ativos', cidadeUf: '' })).toHaveLength(0)
  })

  it('uses fantasy name only as supporting data, not as the official display name', () => {
    expect(getClienteDisplayName(baseCliente)).toBe('Condominio Centro Comercial')
  })
})
