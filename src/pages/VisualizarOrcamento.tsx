import { Copy, Download, Edit3, FileSpreadsheet, GitBranch, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DocumentPreview } from '../components/orcamento/DocumentPreview'
import { StatusBadge } from '../components/orcamento/StatusBadge'
import { cloneOrcamentoAsRevision, getOrcamento, saveOrcamento } from '../data/orcamentoRepository'
import { formatClienteDocumento } from '../lib/clientes'
import { formatCurrency, formatDateBR, formatDateTimeBR, formatOrcamentoNumero } from '../lib/formatters'
import { createDuplicateDraft } from '../lib/orcamento'
import { useOrcamentoActions } from '../hooks/useOrcamentoActions'
import { useAuthStore } from '../stores/authStore'
import type { Orcamento } from '../types'

export function VisualizarOrcamento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null)
  const [loading, setLoading] = useState(true)
  const [creatingRevision, setCreatingRevision] = useState(false)
  const actions = useOrcamentoActions()

  useEffect(() => {
    if (!id) return
    void getOrcamento(id).then((data) => {
      setOrcamento(data)
      setLoading(false)
    })
  }, [id])

  async function duplicateHere() {
    if (!orcamento || !profile) return
    if (orcamento.status === 'excluido') {
      toast.error('Orçamentos excluídos não podem ser duplicados.')
      return
    }

    const created = await saveOrcamento(createDuplicateDraft(orcamento), profile)
    toast.success(`Orçamento ${created.numero} duplicado.`)
    navigate(`/orcamentos/${created.id}/editar`)
  }

  async function createRevision() {
    if (!orcamento || !profile) return
    if (orcamento.status === 'excluido') {
      toast.error('Orçamentos excluídos não podem ser revisados.')
      return
    }
    setCreatingRevision(true)
    try {
      const revisao = await cloneOrcamentoAsRevision(orcamento.id, profile)
      toast.success(`Revisão ${formatOrcamentoNumero(revisao.numero, revisao.revisao)} criada com sucesso!`)
      navigate(`/orcamentos/${revisao.id}/editar`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar revisão.')
    } finally {
      setCreatingRevision(false)
    }
  }

  if (loading) return <div className="skeleton-block">Carregando orçamento...</div>
  if (!orcamento) return <div className="error-state">Orçamento não encontrado.</div>

  const isDeleted = orcamento.status === 'excluido'

  return (
    <section className="view-grid">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              Orçamento {formatOrcamentoNumero(orcamento.numero, orcamento.revisao)}
              {orcamento.revisao > 0 && (
                <span className="revision-badge">REV {orcamento.revisao}</span>
              )}
            </h2>
            <p>{orcamento.servicoCliente}</p>
          </div>
          <StatusBadge status={orcamento.status} />
        </div>

        {isDeleted ? (
          <div className="warning-banner">
            Este orçamento foi marcado como excluído e permanece apenas para rastreabilidade.
          </div>
        ) : null}

        <dl className="meta-grid">
          {orcamento.clienteId ? (
            <div>
              <dt>Cliente cadastrado</dt>
              <dd>
                <Link className="inline-link" to={`/clientes/${orcamento.clienteId}`}>
                  {orcamento.clienteNome ?? 'Ver ficha'}
                </Link>
                {orcamento.clienteDocumento ? ` · ${formatClienteDocumento(orcamento.clienteDocumento)}` : ''}
              </dd>
            </div>
          ) : null}
          {orcamento.representanteNome ? (
            <div>
              <dt>Representante</dt>
              <dd>{orcamento.representanteNome}</dd>
            </div>
          ) : null}
          <div>
            <dt>Data</dt>
            <dd>{formatDateBR(orcamento.dataOrcamento)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{formatCurrency(orcamento.total)}</dd>
          </div>
          <div>
            <dt>Criado por</dt>
            <dd>{orcamento.criadoPorNome}</dd>
          </div>
          <div>
            <dt>Criado em</dt>
            <dd>{formatDateTimeBR(orcamento.criadoEm)}</dd>
          </div>
          <div>
            <dt>Atualizado em</dt>
            <dd>{formatDateTimeBR(orcamento.atualizadoEm)}</dd>
          </div>
          {isDeleted ? (
            <>
              <div>
                <dt>Solicitado por</dt>
                <dd>{orcamento.exclusaoSolicitadaPorNome ?? '-'}</dd>
              </div>
              <div>
                <dt>Excluído por</dt>
                <dd>{orcamento.excluidoPorNome ?? 'Admin'}</dd>
              </div>
              <div>
                <dt>Excluído em</dt>
                <dd>{orcamento.excluidoEm ? formatDateTimeBR(orcamento.excluidoEm) : '-'}</dd>
              </div>
              <div>
                <dt>Motivo</dt>
                <dd>{orcamento.excluidoMotivo}</dd>
              </div>
            </>
          ) : null}
        </dl>

        {orcamento.parentId ? (
          <div className="info-banner" style={{ marginBottom: '0.5rem' }}>
            <GitBranch size={15} />
            Esta é uma revisão. &nbsp;
            <Link className="inline-link" to={`/orcamentos/${orcamento.parentId}`}>
              Ver orçamento original
            </Link>
          </div>
        ) : null}

        <div className="button-row wrap">
          <button className="primary-button" type="button" onClick={() => actions.downloadPdf(orcamento)}>
            <Download size={17} />
            Baixar PDF
          </button>
          <button className="secondary-button" type="button" onClick={() => actions.downloadXlsx(orcamento)}>
            <FileSpreadsheet size={17} />
            Baixar XLSX
          </button>
          {!isDeleted ? (
            <Link className="secondary-button" to={`/orcamentos/${orcamento.id}/editar`}>
              <Edit3 size={17} />
              Editar
            </Link>
          ) : null}
          {!isDeleted ? (
            <button className="secondary-button" type="button" onClick={duplicateHere}>
              <Copy size={17} />
              Duplicar
            </button>
          ) : null}
          {!isDeleted ? (
            <button
              className="secondary-button"
              type="button"
              onClick={createRevision}
              disabled={creatingRevision}
            >
              <GitBranch size={17} />
              {creatingRevision ? 'Criando...' : 'Criar revisão'}
            </button>
          ) : null}
          <button className="secondary-button" type="button" onClick={() => navigate(-1)}>
            <RotateCcw size={17} />
            Voltar
          </button>
        </div>
      </div>

      <DocumentPreview orcamento={orcamento} />
    </section>
  )
}
