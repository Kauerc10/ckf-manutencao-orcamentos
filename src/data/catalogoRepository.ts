import { supabase } from '../lib/supabase'
import { listClientes } from './clienteRepository'
import { normalizarPreco } from '../lib/precos'
import type { Profile } from '../types'
import type { Servico, ServicoDraft, Tabela, TabelaDraft, TabelaItem } from '../types/comercial'

const COMMERCIAL_STORAGE = 'ckf-comercial-v1'
type State = { servicos: Servico[]; tabelas: Tabela[] }
function read(): State {
  return JSON.parse(localStorage.getItem(COMMERCIAL_STORAGE) || '{"servicos":[],"tabelas":[]}') as State
}
function write(state: State) {
  localStorage.setItem(COMMERCIAL_STORAGE, JSON.stringify(state))
}
function assertAdmin(profile: Profile) {
  if (!profile.ativo || profile.role !== 'admin')
    throw new Error('Apenas administradores ativos podem alterar o catálogo e as tabelas.')
}
export async function listServicos(): Promise<Servico[]> {
  if (!supabase) return read().servicos
  const servicos: Servico[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from('catalogo_servicos')
      .select('dados')
      .order('codigo')
      .order('id')
      .range(offset, offset + 499)
    if (error) throw error
    servicos.push(...(data ?? []).map((row) => row.dados as Servico))
    if ((data?.length ?? 0) < 500) break
  }
  return servicos
}
export async function saveServico(input: ServicoDraft, profile: Profile): Promise<Servico> {
  assertAdmin(profile)
  if (![input.codigo, input.nome, input.categoria, input.escopo, input.unidade].every((v) => v.trim()))
    throw new Error('Preencha código, nome, categoria, escopo e unidade.')
  if (
    [input.codigo, input.nome, input.categoria, input.unidade].some((v) => v.length > 200) ||
    input.escopo.length > 2000
  )
    throw new Error('Campos até 200 caracteres; escopo até 2000.')
  if (!Number.isFinite(input.precoPadrao) || input.precoPadrao < 0 || input.precoPadrao > 9999999999.99)
    throw new Error('Informe um preço válido.')
  if (supabase) {
    const { data, error } = await supabase.rpc('save_catalogo_servico', { p_dados: input })
    if (error) throw error
    return data as Servico
  }
  const state = read()
  const existing = state.servicos.find((s) => s.id === input.id)
  if (existing && existing.versao !== input.versao)
    throw new Error('Este serviço foi alterado. Recarregue antes de salvar.')
  if (state.servicos.some((s) => s.id !== input.id && s.codigo.toLowerCase() === input.codigo.trim().toLowerCase()))
    throw new Error('Código já utilizado.')
  const saved: Servico = {
    ...input,
    codigo: input.codigo.trim(),
    id: existing?.id ?? crypto.randomUUID(),
    precoPadrao: normalizarPreco(input.precoPadrao),
    versao: (existing?.versao ?? 0) + 1,
    criadorNome: existing?.criadorNome ?? profile.nome,
    criadoEm: existing?.criadoEm ?? new Date().toISOString(),
    autorNome: profile.nome,
    atualizadoEm: new Date().toISOString(),
  }
  write({ ...state, servicos: [...state.servicos.filter((s) => s.id !== saved.id), saved] })
  return saved
}
export async function listTabelas(): Promise<Tabela[]> {
  if (!supabase) return read().tabelas
  const tabelas: Tabela[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from('tabelas_comerciais')
      .select('dados')
      .order('id')
      .range(offset, offset + 499)
    if (error) throw error
    tabelas.push(...(data ?? []).map((row) => row.dados as Tabela))
    if ((data?.length ?? 0) < 500) break
  }
  return tabelas
}
export async function saveTabela(input: TabelaDraft, profile: Profile): Promise<Tabela> {
  assertAdmin(profile)
  if (!input.titulo.trim() || !input.itens.length)
    throw new Error('Informe um título e selecione pelo menos um serviço.')
  if (new Set(input.itens.map((i) => i.servicoId)).size !== input.itens.length)
    throw new Error('Serviço repetido na tabela.')
  if (supabase) {
    const { data, error } = await supabase.rpc('save_tabela_comercial', { p_dados: input })
    if (error) throw error
    return data as Tabela
  }
  const empresa = (await listClientes()).find((c) => c.id === input.empresaId && c.tipo === 'cnpj' && c.ativo)
  if (!empresa) throw new Error('Selecione uma empresa ativa cadastrada.')
  const state = read()
  const existing = state.tabelas.find((t) => t.empresa.id === input.empresaId)
  if ((existing?.versao ?? 0) !== input.versao) throw new Error('Esta tabela foi alterada. Recarregue antes de salvar.')
  const itens: TabelaItem[] = input.itens.map((i) => {
    const s = state.servicos.find((s) => s.id === i.servicoId)
    if (!s || (!s.ativo && !existing?.itens.some((old) => old.servicoId === s.id)))
      throw new Error('Serviço indisponível para inclusão.')
    if (!Number.isFinite(i.preco) || i.preco < 0 || i.preco > 9999999999.99) throw new Error('Informe um preço válido.')
    // Existing items keep their negotiated scope; removing, saving and adding again uses the catalog.
    const old = existing?.itens.find((old) => old.servicoId === i.servicoId)
    return {
      servicoId: s.id,
      codigo: old?.codigo ?? s.codigo,
      nome: old?.nome ?? s.nome,
      categoria: old?.categoria ?? s.categoria,
      escopo: old?.escopo ?? s.escopo,
      unidade: old?.unidade ?? s.unidade,
      imagem: old?.imagem ?? s.imagem,
      preco: normalizarPreco(i.preco),
      precoReferencia: s.precoPadrao,
    }
  })
  if (
    existing &&
    existing.titulo === input.titulo.trim() &&
    JSON.stringify(existing.itens.map((i) => ({ servicoId: i.servicoId, preco: i.preco }))) ===
      JSON.stringify(input.itens.map((i) => ({ ...i, preco: normalizarPreco(i.preco) })))
  )
    return existing
  const previous = existing
    ? {
        versao: existing.versao,
        titulo: existing.titulo,
        empresa: existing.empresa,
        itens: existing.itens,
        autorNome: existing.autorNome,
        criadoEm: existing.criadoEm,
      }
    : null
  const saved: Tabela = {
    id: existing?.id ?? crypto.randomUUID(),
    titulo: input.titulo.trim(),
    empresa: { id: empresa.id, nome: empresa.nome, documento: empresa.documento },
    versao: input.versao + 1,
    itens,
    autorNome: profile.nome,
    criadoEm: new Date().toISOString(),
    historico: previous ? [previous, ...existing!.historico] : [],
  }
  write({ ...state, tabelas: [...state.tabelas.filter((t) => t.id !== saved.id), saved] })
  return saved
}
export async function removeServico(id: string, profile: Profile): Promise<'archived' | 'deleted'> {
  assertAdmin(profile)
  if (supabase) {
    const { data, error } = await supabase.rpc('remove_catalogo_servico', { p_id: id })
    if (error) throw error
    return data as 'archived' | 'deleted'
  }
  const state = read()
  const referenced = state.tabelas.some((t) => [t, ...t.historico].some((r) => r.itens.some((i) => i.servicoId === id)))
  if (referenced) {
    const s = state.servicos.find((s) => s.id === id)
    if (!s) throw new Error('Serviço não encontrado.')
    await saveServico({ ...s, ativo: false }, profile)
    return 'archived'
  }
  write({ ...state, servicos: state.servicos.filter((s) => s.id !== id) })
  return 'deleted'
}
