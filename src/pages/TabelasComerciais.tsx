import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Save, Download, History, Plus, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { listServicos, listTabelas, saveTabela } from '../data/catalogoRepository'
import { useClientes } from '../hooks/useClientes'
import { useAuthStore } from '../stores/authStore'
import { useSystemSettingsStore } from '../stores/systemSettingsStore'
import { ajustarPreco, diferencaPreco } from '../lib/precos'
import { formatCurrency, formatDateTimeBR, parseLocalizedNumber, sanitizeFilePart } from '../lib/formatters'
import type { Servico, Tabela, TabelaDraft, TabelaRevisao } from '../types/comercial'
import { toTabelaDocument, type TabelaDocument } from '../lib/tabela-document'
import { TabelaPreview } from '../components/TabelaPreview'

function PriceEditor({
  padrao,
  valor,
  disabled,
  onChange,
}: {
  padrao: number
  valor: number
  disabled: boolean
  onChange: (v: number) => void
}) {
  const [mode, setMode] = useState<'valor' | 'percentual'>('valor')
  const [raw, setRaw] = useState(String(valor))
  return (
    <div className="price-editor">
      <select
        aria-label="Forma de ajuste"
        value={mode}
        disabled={disabled}
        onChange={(e) => {
          setMode(e.target.value as typeof mode)
          setRaw(e.target.value === 'valor' ? String(valor) : '')
        }}
      >
        <option value="valor">Valor (R$)</option>
        <option value="percentual">% sobre padrão</option>
      </select>
      <input
        aria-label="Novo preço ou percentual"
        inputMode="decimal"
        disabled={disabled}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
      />
      <button
        type="button"
        className="secondary-button"
        disabled={disabled}
        onClick={() => {
          const n = parseLocalizedNumber(raw)
          if (n === null) {
            toast.error('Informe um número válido.')
            return
          }
          try {
            const p = mode === 'valor' ? n : ajustarPreco(padrao, n)
            if (p < 0 || p > 9999999999.99) throw new Error('Preço inválido.')
            onChange(p)
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Preço inválido.')
          }
        }}
      >
        Aplicar
      </button>
    </div>
  )
}
export function TabelasComerciais() {
  const profile = useAuthStore((s) => s.profile)
  const admin = profile?.ativo && profile.role === 'admin'
  const settings = useSystemSettingsStore((s) => s.settings)
  const { clientes } = useClientes()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [tabelas, setTabelas] = useState<Tabela[]>([])
  const [draft, setDraft] = useState<TabelaDraft | null>(null)
  const [selected, setSelected] = useState<TabelaRevisao | null>(null)
  const [empresaId, setEmpresaId] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imagens, setImagens] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pdfPreview, setPdfPreview] = useState<{ url: string; filename: string; document: TabelaDocument } | null>(null)
  useEffect(
    () => () => {
      if (pdfPreview) URL.revokeObjectURL(pdfPreview.url)
    },
    [pdfPreview],
  )
  const reload = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([listServicos(), listTabelas()])
      setServicos(s)
      setTabelas(t)
      setError('')
    } catch {
      setError('Não foi possível carregar as tabelas. Confira as migrações e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate repository data on mount
    void reload()
  }, [reload])
  function open(t: Tabela) {
    setSelected(t)
    setDraft(null)
    setPdfPreview(null)
  }
  function edit(t?: Tabela) {
    setSelected(null)
    setDraft(
      t
        ? {
            empresaId: t.empresa.id,
            titulo: t.titulo,
            versao: t.versao,
            itens: t.itens.map((i) => ({ servicoId: i.servicoId, preco: i.preco })),
          }
        : { empresaId, titulo: 'Tabela de serviços CKF', versao: 0, itens: [] },
    )
  }
  async function save() {
    if (!draft || !profile) return
    setSaving(true)
    try {
      const t = await saveTabela(draft, profile)
      await reload()
      open(t)
      toast.success('Tabela salva. Histórico preservado.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar tabela.')
    } finally {
      setSaving(false)
    }
  }
  async function exportPDF() {
    if (!selected) return
    setExporting(true)
    try {
      const { createTabelaPDF } = await import('../lib/export-tabela')
      const blob = await createTabelaPDF(selected, settings, imagens)
      setPdfPreview({
        url: URL.createObjectURL(blob),
        filename: `Tabela_${sanitizeFilePart(selected.empresa.nome)}_R${selected.versao}.pdf`,
        document: toTabelaDocument(selected, imagens),
      })
      toast.success('PDF gerado. Confira a prévia e baixe o documento.')
    } catch {
      toast.error('Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }
  const current = draft
    ? tabelas.find((t) => t.empresa.id === draft.empresaId)
    : selected
      ? tabelas.find((t) => t.empresa.id === selected.empresa.id)
      : null
  return (
    <section className="page-stack commercial-page">
      <div className="panel commercial-heading">
        <div>
          <span className="eyebrow dark">Condições por cliente</span>
          <h2>Tabelas por empresa</h2>
          <p>Preços negociados, com histórico e documento para o cliente.</p>
        </div>
        <Link className="secondary-button" to="/catalogo">
          <ArrowLeft size={16} />
          Catálogo principal
        </Link>
      </div>
      {loading ? (
        <div className="panel">Carregando tabelas...</div>
      ) : error ? (
        <div className="panel" role="alert">
          <p>{error}</p>
          <button className="secondary-button" onClick={reload}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {!draft && !selected && (
            <>
              <div className="panel commercial-form">
                <h3>Consultar ou criar tabela</h3>
                <div className="commercial-filters">
                  <label>
                    Empresa
                    <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
                      <option value="">Selecione uma empresa</option>
                      {clientes
                        .filter((c) => c.tipo === 'cnpj' && c.ativo)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    className="secondary-button"
                    disabled={!empresaId}
                    onClick={() => {
                      const t = tabelas.find((t) => t.empresa.id === empresaId)
                      if (t) open(t)
                      else if (admin) edit()
                      else toast.info('Esta empresa ainda não tem tabela.')
                    }}
                  >
                    <Plus size={16} />
                    {admin ? 'Abrir / criar tabela' : 'Consultar tabela'}
                  </button>
                </div>
                <p className="form-note">
                  A empresa deve estar no cadastro de clientes. <Link to="/clientes/novo">Cadastrar empresa</Link>
                </p>
              </div>
              <div className="panel">
                <h3>Tabelas atuais</h3>
                {!tabelas.length ? (
                  <div className="commercial-empty">
                    <History size={30} />
                    <h3>Nenhuma tabela cadastrada</h3>
                    <p>Escolha a empresa e selecione os serviços do catálogo.</p>
                  </div>
                ) : (
                  <div className="commercial-table-wrap">
                    <table className="commercial-table">
                      <thead>
                        <tr>
                          <th>Empresa</th>
                          <th>Tabela</th>
                          <th>Última alteração</th>
                          <th>Autor</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {tabelas.map((t) => (
                          <tr key={t.id}>
                            <td>
                              <strong>{t.empresa.nome}</strong>
                            </td>
                            <td>
                              {t.titulo}
                              <small>
                                Versão {t.versao} · {t.itens.length} serviços
                              </small>
                            </td>
                            <td>{formatDateTimeBR(t.criadoEm)}</td>
                            <td>{t.autorNome}</td>
                            <td>
                              <button className="secondary-button" onClick={() => open(t)}>
                                Consultar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
          {draft && admin && (
            <div className="panel commercial-form">
              <div className="panel-heading">
                <div>
                  <h3>{draft.versao ? 'Editar tabela' : 'Nova tabela'}</h3>
                  <p>{clientes.find((c) => c.id === draft.empresaId)?.nome}</p>
                </div>
                <button className="secondary-button" disabled={saving} onClick={() => setDraft(null)}>
                  Cancelar
                </button>
              </div>
              <label>
                Título
                <input
                  maxLength={200}
                  value={draft.titulo}
                  onChange={(e) => setDraft({ ...draft, titulo: e.target.value })}
                />
              </label>
              <p className="form-note">
                Selecione os serviços. A porcentagem usa o preço padrão atual. Clique em Aplicar para revisar o
                resultado antes de salvar.
              </p>
              <div className="commercial-table-wrap">
                <table className="commercial-table">
                  <thead>
                    <tr>
                      <th>Incluir</th>
                      <th>Serviço</th>
                      <th>Padrão</th>
                      <th>Definir preço</th>
                      <th>Preço final</th>
                      <th>Diferença interna</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicos
                      .filter((s) => s.ativo || draft.itens.some((i) => i.servicoId === s.id))
                      .map((s) => {
                        const item = draft.itens.find((i) => i.servicoId === s.id)
                        const diff = diferencaPreco(s.precoPadrao, item?.preco ?? s.precoPadrao)
                        return (
                          <tr key={s.id}>
                            <td>
                              <input
                                type="checkbox"
                                aria-label={`Incluir ${s.nome}`}
                                checked={!!item}
                                disabled={saving}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    itens: e.target.checked
                                      ? [...draft.itens, { servicoId: s.id, preco: s.precoPadrao }]
                                      : draft.itens.filter((i) => i.servicoId !== s.id),
                                  })
                                }
                              />
                            </td>
                            <td>
                              <small>
                                {s.codigo} · {s.categoria}
                                {!s.ativo ? ' · Arquivado' : ''}
                              </small>
                              <strong>{current?.itens.find((i) => i.servicoId === s.id)?.nome ?? s.nome}</strong>
                              <small>{s.unidade}</small>
                            </td>
                            <td className="money-cell">{formatCurrency(s.precoPadrao)}</td>
                            <td>
                              <PriceEditor
                                key={`${s.id}-${!!item}`}
                                padrao={s.precoPadrao}
                                valor={item?.preco ?? s.precoPadrao}
                                disabled={!item || saving}
                                onChange={(preco) =>
                                  setDraft({
                                    ...draft,
                                    itens: draft.itens.map((i) => (i.servicoId === s.id ? { ...i, preco } : i)),
                                  })
                                }
                              />
                            </td>
                            <td className="money-cell">{item ? formatCurrency(item.preco) : '—'}</td>
                            <td>
                              {item && (
                                <>
                                  <strong>
                                    {diff.reais > 0 ? '+' : ''}
                                    {formatCurrency(diff.reais)}
                                  </strong>
                                  <small>
                                    {diff.percentual === null
                                      ? '% não aplicável'
                                      : `${diff.percentual > 0 ? '+' : ''}${diff.percentual.toLocaleString('pt-BR')}%`}
                                  </small>
                                </>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
              {!servicos.length && <p>Cadastre serviços no catálogo antes de criar a tabela.</p>}
              <div className="form-footer">
                <span className="form-note">
                  {draft.itens.length} serviços selecionados. Os valores acima serão salvos.
                </span>
                <button className="primary-button" disabled={saving || !draft.itens.length} onClick={save}>
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar tabela'}
                </button>
              </div>
            </div>
          )}
          {selected && (
            <>
              <div className="panel">
                <div className="commercial-heading">
                  <div>
                    <span className="eyebrow dark">
                      Versão {selected.versao}
                      {selected.versao !== current?.versao ? ' · Histórico' : ''}
                    </span>
                    <h3>{selected.titulo}</h3>
                    <p>
                      {selected.empresa.nome} · {selected.empresa.documento}
                    </p>
                    <small>
                      {formatDateTimeBR(selected.criadoEm)} · {selected.autorNome}
                    </small>
                  </div>
                  <div className="commercial-actions">
                    <button className="secondary-button" onClick={() => setSelected(null)}>
                      Voltar
                    </button>
                    {admin && current && (
                      <button className="secondary-button" onClick={() => edit(current)}>
                        Editar tabela atual
                      </button>
                    )}
                    <button className="primary-button" disabled={exporting} onClick={exportPDF}>
                      <Download size={16} />
                      {exporting ? 'Gerando PDF...' : 'Exportar PDF'}
                    </button>
                  </div>
                </div>
                <label className="commercial-check">
                  <input type="checkbox" checked={imagens} onChange={(e) => setImagens(e.target.checked)} />
                  Incluir imagens no PDF
                </label>
                <div className="commercial-table-wrap">
                  <table className="commercial-table">
                    <thead>
                      <tr>
                        <th>Código / serviço</th>
                        <th>Categoria / escopo</th>
                        <th>Unidade</th>
                        <th>Preço final</th>
                        <th>Diferença interna*</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.itens.map((i) => {
                        const padrao =
                          selected.versao === current?.versao
                            ? (servicos.find((s) => s.id === i.servicoId)?.precoPadrao ?? i.precoReferencia)
                            : i.precoReferencia
                        const diff = diferencaPreco(padrao, i.preco)
                        return (
                          <tr key={i.servicoId}>
                            <td>
                              <small>{i.codigo}</small>
                              <strong>{i.nome}</strong>
                            </td>
                            <td>
                              <strong>{i.categoria}</strong>
                              <p className="service-scope">{i.escopo}</p>
                            </td>
                            <td>{i.unidade}</td>
                            <td className="money-cell">{formatCurrency(i.preco)}</td>
                            <td>
                              {diff.reais > 0 ? '+' : ''}
                              {formatCurrency(diff.reais)}
                              <small>
                                {diff.percentual === null
                                  ? '% não aplicável'
                                  : `${diff.percentual > 0 ? '+' : ''}${diff.percentual.toLocaleString('pt-BR')}%`}
                              </small>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="form-note">
                  * Comparação com{' '}
                  {selected.versao === current?.versao ? 'o catálogo atual' : 'o preço padrão registrado nesta versão'}.
                  A diferença não aparece no PDF do cliente.
                </p>
              </div>
              <div className="panel">
                <h3>Histórico de tabelas</h3>
                <div className="revision-list">
                  {current &&
                    [current, ...current.historico].map((r) => (
                      <button
                        className={`secondary-button ${r.versao === selected.versao ? 'revision-active' : ''}`}
                        key={r.versao}
                        onClick={() => setSelected(r)}
                      >
                        Versão {r.versao} · {formatDateTimeBR(r.criadoEm)} · {r.autorNome}
                      </button>
                    ))}
                </div>
              </div>
            </>
          )}
          {pdfPreview && (
            <div className="panel">
              <div className="commercial-heading">
                <h3>Documento para o cliente</h3>
                <div className="commercial-actions">
                  <a className="primary-button" href={pdfPreview.url} download={pdfPreview.filename}>
                    Baixar PDF
                  </a>
                  <button className="secondary-button" onClick={() => setPdfPreview(null)}>
                    Fechar prévia
                  </button>
                </div>
              </div>
              <TabelaPreview document={pdfPreview.document} settings={settings} />
            </div>
          )}
        </>
      )}
    </section>
  )
}
