import { beforeEach, expect, it, vi } from 'vitest'
import { DEMO_PROFILE, DEMO_CLIENTES } from '../lib/demo-data'
vi.mock('../lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }))
import { getTicket, updateTicket, convertTicket } from './leadRepository'
import { listOrcamentos } from './orcamentoRepository'
import type { OrcamentoDraft } from '../types'
beforeEach(() => localStorage.clear())
it('serializa conversões simultâneas sem duplicar nem apagar o orçamento vinculado', async () => {
  const cliente = DEMO_CLIENTES.find((c) => c.tipo === 'cnpj')!
  const draft: OrcamentoDraft = {
    revisao: 0,
    parentId: null,
    dataOrcamento: '2026-09-29',
    servicoCliente: cliente.nome,
    clienteId: cliente.id,
    status: 'rascunho',
    observacoes: '',
    validadeDias: 10,
    total: 150,
    itens: [{ descricao: 'Solda', quantidade: 1, valorUnitario: 150, valorTotal: 150 }],
  }
  const before = (await listOrcamentos()).length
  const [first, second] = await Promise.all([
    convertTicket('lead-demo-1', draft, DEMO_PROFILE),
    convertTicket('lead-demo-1', draft, DEMO_PROFILE),
  ])
  expect(first.id).toBe(second.id)
  expect(await listOrcamentos()).toHaveLength(before + 1)
  expect((await getTicket('lead-demo-1'))?.converted_orcamento_id).toBe(first.id)
})
it('mantém histórico de atendimento e reutiliza o orçamento na conversão repetida', async () => {
  await updateTicket('lead-demo-1', 0, 'contacted', DEMO_PROFILE.id, 'Ligamos para o contato.', DEMO_PROFILE)
  expect((await getTicket('lead-demo-1'))?.site_ticket_events[0].details.observacao).toBe('Ligamos para o contato.')
  const draft: OrcamentoDraft = {
    revisao: 0,
    parentId: null,
    dataOrcamento: '2026-09-29',
    servicoCliente: DEMO_CLIENTES[0].nome,
    clienteId: DEMO_CLIENTES[0].id,
    status: 'rascunho',
    observacoes: 'Contato da solicitação',
    validadeDias: 10,
    total: 150,
    itens: [{ descricao: 'Solda informada no lead', quantidade: 1, valorUnitario: 150, valorTotal: 150 }],
  }
  const first = await convertTicket('lead-demo-1', draft, DEMO_PROFILE)
  const second = await convertTicket('lead-demo-1', draft, DEMO_PROFILE)
  expect(second.id).toBe(first.id)
  expect((await listOrcamentos()).filter((o) => o.id === first.id)).toHaveLength(1)
  expect((await getTicket('lead-demo-1'))?.status).toBe('budget_created')
  await expect(updateTicket('lead-demo-1', 0, 'lost', null, '', DEMO_PROFILE)).rejects.toThrow('alterada')
})
