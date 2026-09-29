import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Save, BookOpen, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { listServicos, saveServico, removeServico } from '../data/catalogoRepository'
import { useAuthStore } from '../stores/authStore'
import { formatCurrency, formatDateTimeBR, parseLocalizedNumber } from '../lib/formatters'
import { uploadCatalogoImage } from '../lib/catalogo-images'
import { ServicoImagem } from '../components/ServicoImagem'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { Servico, ServicoDraft } from '../types/comercial'

const empty: ServicoDraft = {
  codigo: '',
  nome: '',
  categoria: '',
  escopo: '',
  unidade: '',
  precoPadrao: 0,
  imagem: '',
  ativo: true,
}
export function Catalogo() {
  const profile = useAuthStore((s) => s.profile)
  const admin = profile?.ativo && profile.role === 'admin'
  const [servicos, setServicos] = useState<Servico[]>([])
  const [draft, setDraft] = useState<ServicoDraft | null>(null)
  const [price, setPrice] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [archived, setArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [remove, setRemove] = useState<Servico | null>(null)
  const reload = useCallback(async () => {
    try {
      setServicos(await listServicos())
      setError('')
    } catch {
      setError('Não foi possível carregar o catálogo. Confira se as migrações foram aplicadas e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load repository data on mount
    void reload()
  }, [reload])
  function edit(s: ServicoDraft) {
    setDraft({ ...s })
    setPrice(String(s.precoPadrao))
  }
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!draft || !profile) return
    const value = parseLocalizedNumber(price)
    if (value === null) {
      toast.error('Informe o preço padrão.')
      return
    }
    setSaving(true)
    try {
      await saveServico({ ...draft, precoPadrao: value }, profile)
      setDraft(null)
      await reload()
      toast.success('Serviço salvo.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar serviço.')
    } finally {
      setSaving(false)
    }
  }
  const visible = servicos.filter(
    (s) =>
      (archived || s.ativo) &&
      (!category || s.categoria === category) &&
      `${s.codigo} ${s.nome}`.toLowerCase().includes(search.toLowerCase()),
  )
  const editingService = servicos.find((s) => s.id === draft?.id)
  return (
    <section className="page-stack commercial-page">
      <div className="panel commercial-heading">
        <div>
          <span className="eyebrow dark">Referência comercial</span>
          <h2>Catálogo de serviços</h2>
          <p>Serviços, escopo e preços padrão da CKF.</p>
        </div>
        <div className="commercial-actions">
          <Link className="secondary-button" to="/tabelas">
            <BookOpen size={16} />
            Tabelas por empresa
          </Link>
          {admin && (
            <button className="secondary-button" onClick={() => edit(empty)}>
              <Plus size={16} />
              Novo serviço
            </button>
          )}
        </div>
      </div>
      {draft && admin && (
        <form className="panel commercial-form" onSubmit={submit}>
          <div className="panel-heading">
            <h3>{draft.id ? 'Editar serviço' : 'Novo serviço'}</h3>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setDraft(null)}
              disabled={saving || uploading}
            >
              Cancelar
            </button>
          </div>
          <div className="commercial-fields">
            {(['codigo', 'nome', 'categoria', 'unidade'] as const).map((key) => (
              <label key={key}>
                {{ codigo: 'Código', nome: 'Serviço', categoria: 'Categoria', unidade: 'Unidade de cobrança' }[key]}
                <input
                  required
                  maxLength={200}
                  value={draft[key]}
                  list={key === 'categoria' ? 'categorias' : key === 'unidade' ? 'unidades' : undefined}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
              </label>
            ))}
            <label>
              Preço padrão (R$)
              <input required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
            <label className="commercial-check">
              <input
                type="checkbox"
                checked={draft.ativo}
                onChange={(e) => setDraft({ ...draft, ativo: e.target.checked })}
              />
              Serviço ativo
            </label>
            <label className="commercial-wide">
              Escopo — o que está incluído
              <textarea
                required
                maxLength={2000}
                rows={3}
                value={draft.escopo}
                onChange={(e) => setDraft({ ...draft, escopo: e.target.value })}
              />
            </label>
            <label className="commercial-wide">
              Imagem opcional (PNG, JPEG ou WebP, até 5 MB)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading || saving}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file || !profile) return
                  setUploading(true)
                  try {
                    const path = await uploadCatalogoImage(file, profile)
                    setDraft((current) => (current ? { ...current, imagem: path } : null))
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Falha no envio.')
                  } finally {
                    setUploading(false)
                  }
                }}
              />
              {uploading && <span>Enviando imagem...</span>}
            </label>
          </div>
          {editingService && (
            <p className="form-note">
              Criado por {editingService.criadorNome} em {formatDateTimeBR(editingService.criadoEm)} · Última alteração
              por {editingService.autorNome} em {formatDateTimeBR(editingService.atualizadoEm)}
            </p>
          )}
          {draft.imagem && (
            <div className="commercial-actions">
              <ServicoImagem path={draft.imagem} nome={draft.nome} />
              <button type="button" className="secondary-button" onClick={() => setDraft({ ...draft, imagem: '' })}>
                Retirar imagem
              </button>
            </div>
          )}
          <datalist id="categorias">
            {[...new Set(servicos.map((s) => s.categoria))].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <datalist id="unidades">
            {[...new Set(['hora', 'unidade', 'metro', 'serviço', ...servicos.map((s) => s.unidade)])].map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <div className="form-footer">
            <span className="form-note">Preços de tabelas existentes são preservados.</span>
            <button className="primary-button" disabled={saving || uploading}>
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar serviço'}
            </button>
          </div>
        </form>
      )}
      <div className="panel">
        <div className="commercial-filters">
          <label>
            Buscar
            <input value={search} placeholder="Código ou nome do serviço" onChange={(e) => setSearch(e.target.value)} />
          </label>
          <label>
            Categoria
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todas</option>
              {[...new Set(servicos.map((s) => s.categoria))].sort().map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="commercial-check">
            <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
            Incluir arquivados
          </label>
        </div>
        {loading ? (
          <p>Carregando catálogo...</p>
        ) : error ? (
          <div role="alert">
            <p>{error}</p>
            <button className="secondary-button" onClick={reload}>
              Tentar novamente
            </button>
          </div>
        ) : !visible.length ? (
          <div className="commercial-empty">
            <BookOpen size={30} />
            <h3>{servicos.length ? 'Nenhum serviço encontrado' : 'Seu catálogo começa aqui'}</h3>
            <p>
              {servicos.length
                ? 'Revise a busca e os filtros.'
                : 'Cadastre os serviços para montar tabelas por empresa.'}
            </p>
          </div>
        ) : (
          <div className="commercial-table-wrap">
            <table className="commercial-table">
              <thead>
                <tr>
                  <th>Código / serviço</th>
                  <th>Categoria e escopo</th>
                  <th>Unidade</th>
                  <th>Preço padrão</th>
                  {admin && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="service-identity">
                        <ServicoImagem path={s.imagem} nome={s.nome} />
                        <div>
                          <small>
                            {s.codigo}
                            {!s.ativo ? ' · Arquivado' : ''}
                          </small>
                          <strong>{s.nome}</strong>
                          <small>
                            Atualizado por {s.autorNome} · {formatDateTimeBR(s.atualizadoEm)}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{s.categoria}</strong>
                      <p className="service-scope">{s.escopo}</p>
                    </td>
                    <td>{s.unidade}</td>
                    <td className="money-cell">{formatCurrency(s.precoPadrao)}</td>
                    {admin && (
                      <td>
                        <div className="commercial-actions">
                          <button className="secondary-button" aria-label={`Editar ${s.nome}`} onClick={() => edit(s)}>
                            <Pencil size={15} />
                          </button>
                          <button
                            className="secondary-button"
                            aria-label={`Remover ${s.nome}`}
                            onClick={() => setRemove(s)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!remove}
        title="Remover serviço?"
        description={`${remove?.nome ?? ''}: se já foi usado em uma tabela, será arquivado para preservar o histórico.`}
        confirmLabel="Remover ou arquivar"
        confirming={saving}
        onCancel={() => setRemove(null)}
        onConfirm={async () => {
          if (!remove || !profile) return
          setSaving(true)
          try {
            const result = await removeServico(remove.id, profile)
            toast.success(result === 'archived' ? 'Serviço arquivado.' : 'Serviço removido.')
            setRemove(null)
            await reload()
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Falha ao remover.')
          } finally {
            setSaving(false)
          }
        }}
      />
    </section>
  )
}
