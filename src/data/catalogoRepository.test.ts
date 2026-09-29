import { beforeEach, expect, it, vi } from 'vitest'
import { DEMO_PROFILE, DEMO_CLIENTES } from '../lib/demo-data'
vi.mock('../lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }))
import { listServicos, saveServico, saveTabela, listTabelas, removeServico } from './catalogoRepository'

beforeEach(() => localStorage.clear())
it('preserva o preço negociado e a revisão anterior depois de reajustar o padrão', async () => {
  const servico = await saveServico(
    {
      codigo: 'S-001',
      nome: 'Solda',
      categoria: 'Soldagem',
      escopo: 'Solda de uma peça',
      unidade: 'unidade',
      precoPadrao: 100,
      imagem: '',
      ativo: true,
    },
    DEMO_PROFILE,
  )
  const empresa = DEMO_CLIENTES.find((c) => c.tipo === 'cnpj')!
  const tabela = await saveTabela(
    { empresaId: empresa.id, titulo: 'Tabela comercial', versao: 0, itens: [{ servicoId: servico.id, preco: 90 }] },
    DEMO_PROFILE,
  )
  await saveServico({ ...servico, precoPadrao: 110 }, { ...DEMO_PROFILE, nome: 'Outro administrador' })
  const atualizado = (await listServicos()).find((s) => s.id === servico.id)!
  expect(atualizado.precoPadrao).toBe(110)
  expect(atualizado).toMatchObject({
    criadorNome: DEMO_PROFILE.nome,
    criadoEm: servico.criadoEm,
    autorNome: 'Outro administrador',
  })
  const atual = (await listTabelas()).find((t) => t.id === tabela.id)!
  expect(atual.itens[0].preco).toBe(90)
  expect(atual.itens[0].precoReferencia).toBe(100)
  const nova = await saveTabela(
    {
      empresaId: empresa.id,
      titulo: atual.titulo,
      versao: atual.versao,
      itens: [{ servicoId: servico.id, preco: 120 }],
    },
    DEMO_PROFILE,
  )
  expect(nova.versao).toBe(2)
  expect(nova.historico[0].itens[0].preco).toBe(90)
  expect(nova.historico[0].autorNome).toBe(DEMO_PROFILE.nome)
})
it('arquiva serviço utilizado e mantém tabela sem revisão extra em salvamento idêntico', async () => {
  const s = await saveServico(
    {
      codigo: 'S-2',
      nome: 'Solda',
      categoria: 'Soldagem',
      escopo: 'Uma peça',
      unidade: 'hora',
      precoPadrao: 100,
      imagem: '',
      ativo: true,
    },
    DEMO_PROFILE,
  )
  const draft = {
    empresaId: DEMO_CLIENTES.find((c) => c.tipo === 'cnpj')!.id,
    titulo: 'Tabela',
    versao: 0,
    itens: [{ servicoId: s.id, preco: 90 }],
  }
  const t = await saveTabela(draft, DEMO_PROFILE)
  expect((await saveTabela({ ...draft, versao: 1 }, DEMO_PROFILE)).versao).toBe(1)
  await expect(saveTabela({ ...draft, versao: 0 }, DEMO_PROFILE)).rejects.toThrow('alterada')
  expect(await removeServico(s.id, DEMO_PROFILE)).toBe('archived')
  expect((await listServicos())[0].ativo).toBe(false)
  expect((await listTabelas())[0].itens[0].preco).toBe(90)
  expect(t.historico).toHaveLength(0)
  await expect(saveTabela({ ...draft, versao: 1 }, { ...DEMO_PROFILE, role: 'usuario' })).rejects.toThrow(
    'administradores',
  )
})
