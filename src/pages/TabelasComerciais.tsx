import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, History, Plus, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { listServicos, listTabelas } from '../data/catalogoRepository'
import { useAuthStore } from '../stores/authStore'
import { useSystemSettingsStore } from '../stores/systemSettingsStore'
import { diferencaPreco } from '../lib/precos'
import { formatCurrency, formatDateTimeBR, sanitizeFilePart } from '../lib/formatters'
import type { Servico, Tabela, TabelaRevisao } from '../types/comercial'
import { toTabelaDocument, type TabelaDocument } from '../lib/tabela-document'
import { TabelaPreview } from '../components/TabelaPreview'
import { formatClienteDocumento } from '../lib/clientes'

export function TabelasComerciais() {
  const profile = useAuthStore((s) => s.profile)
  const admin = profile?.ativo && profile.role === 'admin'
  const settings = useSystemSettingsStore((s) => s.settings)
  const [params, setParams] = useSearchParams()
  const tabelaId = params.get('tabela')
  const [servicos, setServicos] = useState<Servico[]>([])
  const [tabelas, setTabelas] = useState<Tabela[]>([])
  const [revision, setRevision] = useState<number | null>(null)
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
    setParams({ tabela: t.id })
    setRevision(null)
    setPdfPreview(null)
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
  const current = tabelas.find((t) => t.id === tabelaId)
  const selected: TabelaRevisao | undefined =
    revision === null ? current : ([current, ...(current?.historico ?? [])].find((r) => r?.versao === revision) ?? current)
  return (
    <section className="page-stack commercial-page">
      <div className="panel commercial-heading">
        <div>
          <h2>Tabelas por empresa</h2>
        </div>
        <div className="commercial-actions">
          <Link className="secondary-button" to="/catalogo">
            <ArrowLeft size={16} />
            Catálogo principal
          </Link>
          {admin && !selected && (
            <Link className="primary-button" to="/tabelas/novo">
              <Plus size={16} />
              Nova tabela
            </Link>
          )}
        </div>
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
          {!selected && !tabelaId && (
            <div className="panel">
              {!tabelas.length ? (
                <div className="commercial-empty">
                  <History size={30} />
                  <h3>Nenhuma tabela cadastrada</h3>
                  <p>Crie uma tabela para uma empresa cadastrada.</p>
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
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabelas.map((t) => (
                        <tr key={t.id}>
                          <td><strong>{t.empresa.nome}</strong><small>{formatClienteDocumento(t.empresa.documento)}</small></td>
                          <td>
                            {t.titulo}
                            <small>Versão {t.versao} · {t.itens.length} {t.itens.length === 1 ? 'serviço' : 'serviços'}</small>
                          </td>
                          <td>{formatDateTimeBR(t.criadoEm)}</td>
                          <td>{t.autorNome}</td>
                          <td><button className="secondary-button" onClick={() => open(t)}>Consultar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {tabelaId && !selected && (
            <div className="panel" role="alert">
              <p>Tabela não encontrada.</p>
              <button className="secondary-button" onClick={() => setParams({})}>Voltar às tabelas</button>
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
                      {selected.empresa.nome} · {formatClienteDocumento(selected.empresa.documento)}
                    </p>
                    <small>
                      {formatDateTimeBR(selected.criadoEm)} · {selected.autorNome}
                    </small>
                  </div>
                  <div className="commercial-actions">
                    <button className="secondary-button" onClick={() => { setParams({}); setRevision(null); setPdfPreview(null) }}>
                      Voltar
                    </button>
                    {admin && current && (
                      <Link className="secondary-button" to={`/tabelas/${current.id}/editar`}>
                        Editar tabela atual
                      </Link>
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
                        onClick={() => { setRevision(r.versao); setPdfPreview(null) }}
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
