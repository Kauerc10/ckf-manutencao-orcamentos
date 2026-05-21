import { describe, expect, it } from 'vitest'
import type { Cliente } from '../types'
import { createClienteLinkPatch, createRepresentantePatch } from './orcamento-cliente-link'

const baseCliente: Cliente = {
  id: 'cliente-1',
  tipo: 'cnpj',
  nome: 'Cliente Operacional',
  documento: '12.345.678/0001-90',
  rg: '',
  nomeFantasia: 'Operacional',
  email: '',
  telefonePrincipal: '',
  telefoneAlternativo: '',
  inscricaoEstadual: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: 'Sao Paulo',
  uf: 'SP',
  referenciaAcesso: '',
  observacoes: '',
  tags: [],
  ativo: true,
  criadoPor: 'user',
  criadoPorNome: 'User',
  atualizadoPor: null,
  criadoEm: '',
  atualizadoEm: '',
  representantes: [
    {
      id: 'rep-1',
      nome: 'Ana Principal',
      cargo: 'Diretora',
      telefone: '',
      email: '',
      observacao: '',
      principal: true,
      ativo: true,
    },
    {
      id: 'rep-2',
      nome: 'Bruno Apoio',
      cargo: 'Compras',
      telefone: '',
      email: '',
      observacao: '',
      principal: false,
      ativo: true,
    },
  ],
}

describe('orcamento cliente link helpers', () => {
  it('selects a CPF client and clears representative fields', () => {
    const cliente: Cliente = {
      ...baseCliente,
      tipo: 'cpf',
      representantes: [],
    }

    expect(createClienteLinkPatch(cliente, '')).toMatchObject({
      clienteId: 'cliente-1',
      clienteNome: 'Cliente Operacional',
      clienteDocumento: '12.345.678/0001-90',
      representanteId: null,
      representanteNome: null,
      servicoCliente: 'Cliente Operacional',
    })
  })

  it('selects the principal representative for a CNPJ client', () => {
    expect(createClienteLinkPatch(baseCliente, '')).toMatchObject({
      clienteId: 'cliente-1',
      representanteId: 'rep-1',
      representanteNome: 'Ana Principal',
      servicoCliente: 'Cliente Operacional',
    })
  })

  it('unlinks the client while preserving the current service field', () => {
    expect(createClienteLinkPatch(null, 'Servico manual')).toEqual({
      clienteId: null,
      clienteNome: null,
      clienteDocumento: null,
      representanteId: null,
      representanteNome: null,
      servicoCliente: 'Servico manual',
    })
  })

  it('does not overwrite a manually filled service field when switching clients', () => {
    expect(createClienteLinkPatch(baseCliente, 'Servico ja descrito').servicoCliente).toBe('Servico ja descrito')
  })

  it('selects an existing active representative and clears missing ones', () => {
    expect(createRepresentantePatch(baseCliente, 'rep-2')).toEqual({
      representanteId: 'rep-2',
      representanteNome: 'Bruno Apoio',
    })

    expect(createRepresentantePatch(baseCliente, 'rep-inexistente')).toEqual({
      representanteId: null,
      representanteNome: null,
    })
  })
})
