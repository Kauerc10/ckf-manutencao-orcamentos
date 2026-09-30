import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Download, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { listServicos, removeServico } from '../data/catalogoRepository'
import { formatCurrency, formatDateTimeBR } from '../lib/formatters'
import { toCatalogoDocument, type TabelaDocument } from '../lib/tabela-document'
import { useAuthStore } from '../stores/authStore'
import { useSystemSettingsStore } from '../stores/systemSettingsStore'
import { ServicoImagem } from '../components/ServicoImagem'
import { TabelaPreview } from '../components/TabelaPreview'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { Servico } from '../types/comercial'

export function Catalogo() {
  const profile = useAuthStore((s) => s.profile)
  const admin = profile?.ativo && profile.role === 'admin'
  const settings = useSystemSettingsStore((s) => s.settings)
  const [servicos, setServicos] = useState<Servico[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [archived, setArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [remove, setRemove] = useState<Servico | null>(null)
  const [imagens, setImagens] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pdfPreview, setPdfPreview] = useState<{
    url: string
    filename: string
    document: TabelaDocument
  } | null>(null)
  useEffect(
    () => () => {
      if (pdfPreview) URL.revokeObjectURL(pdfPreview.url)
    },
    [pdfPreview],
  )
  const reload = useCallback(async () => {
    try {
      setServicos(await listServicos())
      setError('')
    } catch {
      setError('Não foi possível carregar o catálogo. Confira as migrações e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate repository data on mount
    void reload()
  }, [reload])
  const ativos = servicos.filter((s) => s.ativo)
  const visible = servicos.filter(
    (s) =>
      (archived || s.ativo) &&
      (!category || s.categoria === category) &&
      `${s.codigo} ${s.nome}`.toLowerCase().includes(search.toLowerCase()),
  )
  async function gerarPDF() {
    if (!ativos.length) return
    setExporting(true)
    try {
      const { createCatalogoPDF } = await import('../lib/export-tabela')
      const document = toCatalogoDocument(ativos, imagens)
      const blob = await createCatalogoPDF(ativos, settings, imagens)
      setPdfPreview({
        url: URL.createObjectURL(blob),
        filename: `Catalogo_CKF_${new Date().toISOString().slice(0, 10)}.pdf`,
        document,
      })
      toast.success('PDF do catálogo gerado. Confira a prévia e baixe o documento.')
    } catch (e) {
      console.error('Falha ao gerar PDF do catálogo', e)
      toast.error(e instanceof Error ? e.message : 'Não foi possível gerar o PDF do catálogo.')
    } finally {
      setExporting(false)
    }
  }
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
            <Link className="secondary-button" to="/catalogo/novo">
              <Plus size={16} />
              Novo serviço
            </Link>
          )}
        </div>
      </div>
      <div className="panel commercial-form">
        <div className="commercial-heading">
          <div>
            <h3>PDF do catálogo principal</h3>
            <p>
              Todos os serviços ativos, organizados por categoria. O preço mostrado é o padrão para cada unidade de
              cobrança.
            </p>
          </div>
          <button className="primary-button" disabled={!ativos.length || exporting} onClick={gerarPDF}>
            <Download size={16} />
            {exporting ? 'Gerando...' : 'Gerar PDF do catálogo'}
          </button>
        </div>
        <label className="commercial-check">
          <input type="checkbox" checked={imagens} onChange={(e) => setImagens(e.target.checked)} />
          Incluir imagens no PDF
        </label>
        {!ativos.length && <p className="form-note">Cadastre ao menos um serviço ativo para gerar o PDF.</p>}
      </div>
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
              <RefreshCw size={15} />
              Tentar novamente
            </button>
          </div>
        ) : !visible.length ? (
          <div className="commercial-empty">
            <BookOpen size={30} />
            <h3>{servicos.length ? 'Nenhum serviço encontrado' : 'Seu catálogo começa aqui'}</h3>
            <p>
              {servicos.length ? 'Revise a busca e os filtros.' : 'Cadastre serviços para montar tabelas por empresa.'}
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
                    <td className="money-cell">
                      {formatCurrency(s.precoPadrao)}
                      <small>por {s.unidade}</small>
                    </td>
                    {admin && (
                      <td>
                        <div className="commercial-actions">
                          <Link
                            className="secondary-button"
                            aria-label={`Editar ${s.nome}`}
                            to={`/catalogo/${s.id}/editar`}
                          >
                            <Pencil size={15} />
                          </Link>
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
      {pdfPreview && (
        <div className="panel">
          <div className="commercial-heading">
            <h3>Documento para conferir</h3>
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
