import { describe, expect, it } from 'vitest'
import {
  applyClienteFilters,
  formatClienteDocumento,
  formatRg,
  getClienteDisplayName,
  hasClienteAddress,
  normalizeClienteRepresentantesForSave,
  normalizeDocumento,
  sanitizeClienteDraftByTipo,
} from './clientes'
import { clienteFormSchema } from './validations'
import type { Cliente, ClienteDraft } from '../types'

const baseCliente: Cliente = {
  id: 'cliente-1',
  tipo: 'cnpj',
  nome: 'Condominio Centro Comercial',
  documento: '12345678000195',
  nomeFantasia: 'Centro Comercial',
  email: 'contato@centro.test',
  telefonePrincipal: '(47) 3333-4444',
  telefoneAlternativo: '',
  rg: '',
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
    expect(formatRg('123456789')).toBe('12.345.678-9')
  })

  it('validates operational CPF and CNPJ records with type-specific fields', () => {
    const cpfResult = clienteFormSchema.safeParse({
      tipo: 'cpf',
      nome: 'Joao Cliente',
      documento: '11144477735',
      rg: '123456789',
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
    expect(cpfResult.data?.inscricaoEstadual).toBe('')
    expect(cnpjResult.data?.rg).toBe('')
  })

  it('allows quick CNPJ records without representative or address', () => {
    const result = clienteFormSchema.safeParse({
      tipo: 'cnpj',
      nome: 'Empresa Rapida',
      documento: '57461028000143',
      telefonePrincipal: '(47) 3333-2222',
      cep: '',
      logradouro: '',
      numero: '',
      bairro: '',
      cidade: '',
      uf: '',
      representantes: [{ nome: '', cargo: '', telefone: '', principal: true }],
    })

    expect(result.success).toBe(true)
    expect(result.data?.representantes).toHaveLength(0)
    expect(hasClienteAddress(result.data!)).toBe(false)
  })

  it('requires the main contact phone for quick customer records', () => {
    const result = clienteFormSchema.safeParse({
      tipo: 'cpf',
      nome: 'Cliente Sem Telefone',
      documento: '11144477735',
      telefonePrincipal: '',
      representantes: [],
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain('telefonePrincipal')
  })

  it('normalizes filled representatives and keeps the first one as principal when needed', () => {
    const representantes = normalizeClienteRepresentantesForSave([
      { nome: '', cargo: '', telefone: '', email: '', observacao: '', principal: true, ativo: true },
      { nome: 'Ana Gestora', cargo: '', telefone: '', email: '', observacao: '', principal: false, ativo: true },
    ])

    expect(representantes).toHaveLength(1)
    expect(representantes[0].principal).toBe(true)
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

  it('sanitizes type-specific fields when switching between CPF and CNPJ', () => {
    const cpfDraft: ClienteDraft = {
      ...baseCliente,
      tipo: 'cpf',
      nome: 'Carlos Roberto',
      documento: '11144477735',
      rg: '123456789',
      inscricaoEstadual: 'ISENTO',
      representantes: [
        {
          id: 'rep-2',
          clienteId: 'cliente-1',
          nome: 'Contato antigo',
          cargo: 'Gerente',
          telefone: '(47) 99999-9999',
          email: '',
          observacao: '',
          principal: true,
          ativo: true,
        },
      ],
    }

    const cnpjDraft = sanitizeClienteDraftByTipo(cpfDraft, 'cnpj')
    expect(cnpjDraft.rg).toBe('')
    expect(cnpjDraft.representantes).toHaveLength(1)

    const pfDraft = sanitizeClienteDraftByTipo(
      {
        ...baseCliente,
        tipo: 'cnpj',
        rg: '987654321',
      },
      'cpf',
    )

    expect(pfDraft.inscricaoEstadual).toBe('')
    expect(pfDraft.nomeFantasia).toBe('')
    expect(pfDraft.representantes).toHaveLength(0)
  })
})
