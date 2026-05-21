import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_PROFILE } from '../lib/demo-data'
import type { OrcamentoDraft, Profile } from '../types'

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}))

const { deleteOrcamento, listOrcamentos, saveOrcamento } = await import('./orcamentoRepository')

const validDraft: OrcamentoDraft = {
  dataOrcamento: '2026-05-18',
  servicoCliente: 'Cliente novo',
  status: 'rascunho',
  observacoes: '',
  validadeDias: 10,
  total: 120,
  itens: [{ quantidade: 1, descricao: 'Servico tecnico', valorUnitario: 120, valorTotal: 120 }],
}

describe('orcamento repository deletion audit', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('marks a quotation as deleted with admin approval and keeps numbering traceable', async () => {
    const requester: Profile = { ...DEMO_PROFILE, id: 'requester-1', nome: 'Tecnico CKF', role: 'usuario' }
    const deleted = await deleteOrcamento(
      {
        id: 'demo-2',
        motivo: 'Cliente solicitou remocao do registro.',
        adminIdentifier: DEMO_PROFILE.email,
        adminPassword: 'demo-local',
      },
      requester,
    )

    expect(deleted).toMatchObject({
      id: 'demo-2',
      numero: 286,
      status: 'excluido',
      excluidoPor: DEMO_PROFILE.id,
      excluidoPorNome: DEMO_PROFILE.nome,
      exclusaoSolicitadaPor: requester.id,
      exclusaoSolicitadaPorNome: requester.nome,
      excluidoMotivo: 'Cliente solicitou remocao do registro.',
    })
    expect(deleted.excluidoEm).toEqual(expect.any(String))

    const created = await saveOrcamento(validDraft, DEMO_PROFILE)
    expect(created.numero).toBe(287)

    const all = await listOrcamentos()
    expect(all.map((orcamento) => orcamento.numero)).toEqual([287, 286, 285])
    expect(all.find((orcamento) => orcamento.id === 'demo-2')?.status).toBe('excluido')
  })

  it('requires a deletion reason and valid admin credentials', async () => {
    await expect(
      deleteOrcamento(
        { id: 'demo-1', motivo: 'Duplicado.', adminIdentifier: DEMO_PROFILE.email, adminPassword: 'senha-errada' },
        DEMO_PROFILE,
      ),
    ).rejects.toThrow('Credenciais de administrador inválidas.')

    await expect(
      deleteOrcamento(
        { id: 'demo-1', motivo: '   ', adminIdentifier: DEMO_PROFILE.email, adminPassword: 'demo-local' },
        DEMO_PROFILE,
      ),
    ).rejects.toThrow(
      'Informe o motivo da exclusão.',
    )
  })

  it('does not allow editing a deleted quotation', async () => {
    await deleteOrcamento(
      {
        id: 'demo-1',
        motivo: 'Registro substituido por nova revisao.',
        adminIdentifier: DEMO_PROFILE.email,
        adminPassword: 'demo-local',
      },
      DEMO_PROFILE,
    )

    await expect(saveOrcamento({ ...validDraft, id: 'demo-1' }, DEMO_PROFILE)).rejects.toThrow(
      'Orçamentos excluídos não podem ser editados.',
    )
  })

  it('clones a quotation as a new revision and increments the revision number', async () => {
    const { cloneOrcamentoAsRevision } = await import('./orcamentoRepository')
    
    // original 'demo-1' has numero: 285, revisao: 0 (default)
    const cloned1 = await cloneOrcamentoAsRevision('demo-1', DEMO_PROFILE)
    
    expect(cloned1).toBeDefined()
    expect(cloned1.numero).toBe(285)
    expect(cloned1.revisao).toBe(1)
    expect(cloned1.parentId).toBe('demo-1')
    expect(cloned1.status).toBe('rascunho')
    expect(cloned1.servicoCliente).toBe('Filial São José')
    expect(cloned1.total).toBe(500)
    expect(cloned1.itens).toHaveLength(1)

    // Now clone the revision to get revision 2
    const cloned2 = await cloneOrcamentoAsRevision(cloned1.id, DEMO_PROFILE)
    expect(cloned2.numero).toBe(285)
    expect(cloned2.revisao).toBe(2)
    expect(cloned2.parentId).toBe(cloned1.id)
    expect(cloned2.status).toBe('rascunho')
  })
})
