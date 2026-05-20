import { Archive, ArrowLeft, Edit3, FileClock, Plus, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StatusBadge } from '../components/orcamento/StatusBadge'
import { archiveCliente, getCliente, listClienteActivity } from '../data/clienteRepository'
import { listOrcamentos } from '../data/orcamentoRepository'
import { formatClienteDocumento, formatRg, getClienteEndereco } from '../lib/clientes'
import { formatCurrency, formatDateBR, formatDateTimeBR, formatOrcamentoNumero } from '../lib/formatters'
import { useAuthStore } from '../stores/authStore'
import type { ActivityLog, Cliente, Orcamento } from '../types'

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    create: 'Criado',
    update: 'Atualizado',
    archive: 'Arquivado',
  }
  return labels[action] ?? action
}

export function ClienteDetalhe() {
  const { id } = useParams()
  const profile = useAuthStore((state) => state.profile)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [archiveOpen, setArchiveOpen] = useState(false)

  async function load() {
    if (!id) return
    setLoading(true)
    const [clienteData, allOrcamentos, logs] = await Promise.all([getCliente(id), listOrcamentos(), listClienteActivity(id)])
    setCliente(clienteData)
    setOrcamentos(allOrcamentos.filter((orcamento) => orcamento.clienteId === id))
    setActivity(logs)
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- detail page hydration is driven by async repository reads
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const totalAprovado = useMemo(
    () => orcamentos.filter((orcamento) => orcamento.status === 'aprovado').reduce((sum, orcamento) => sum + orcamento.total, 0),
    [orcamentos],
  )

  async function confirmArchive() {
    if (!cliente || !profile) return
    await archiveCliente(cliente.id, profile)
    toast.success('Cliente arquivado.')
    setArchiveOpen(false)
    await load()
  }

  if (loading) return <div className="skeleton-block">Carregando ficha do cliente...</div>
  if (!cliente) return <div className="error-state">Cliente nao encontrado.</div>

  const principal = cliente.representantes.find((representante) => representante.principal && representante.ativo)
  const activeRepresentantes = cliente.representantes.filter((representante) => representante.ativo)

  return (
    <section className="page-stack">
      <section className="panel client-profile-hero">
        <div className="panel-heading">
          <div>
            <span className="eyebrow dark">{cliente.tipo.toUpperCase()}</span>
            <h2>{cliente.nome}</h2>
            <p>{formatClienteDocumento(cliente.documento)}</p>
          </div>
          <div className="button-row wrap">
            <Link className="secondary-button" to="/clientes">
              <ArrowLeft size={16} />
              Voltar
            </Link>
            <Link className="secondary-button" to={`/clientes/${cliente.id}/editar`}>
              <Edit3 size={16} />
              Editar
            </Link>
            <Link className="primary-button" to={`/orcamentos/novo?clienteId=${cliente.id}`}>
              <Plus size={16} />
              Novo orcamento
            </Link>
            {cliente.ativo ? (
              <button className="secondary-button danger-text" type="button" onClick={() => setArchiveOpen(true)}>
                <Archive size={16} />
                Arquivar
              </button>
            ) : null}
          </div>
        </div>

        <div className="meta-grid client-meta-grid">
          <div>
            <dt>{cliente.tipo === 'cpf' ? 'CPF' : 'CNPJ'}</dt>
            <dd>{formatClienteDocumento(cliente.documento)}</dd>
          </div>
          <div>
            <dt>Telefone</dt>
            <dd>{cliente.telefonePrincipal}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{cliente.email || 'Nao informado'}</dd>
          </div>
          <div>
            <dt>Endereco</dt>
            <dd>{getClienteEndereco(cliente)}</dd>
          </div>
          <div>
            <dt>{cliente.tipo === 'cpf' ? 'RG' : 'Inscricao estadual'}</dt>
            <dd>{cliente.tipo === 'cpf' ? (cliente.rg ? formatRg(cliente.rg) : 'Nao informado') : cliente.inscricaoEstadual || 'Nao informado'}</dd>
          </div>
          <div>
            <dt>Principal contato</dt>
            <dd>{principal ? `${principal.nome} · ${principal.cargo}` : 'Nao se aplica'}</dd>
          </div>
          <div>
            <dt>Orcamentos vinculados</dt>
            <dd>{orcamentos.length}</dd>
          </div>
          <div>
            <dt>Total aprovado</dt>
            <dd>{formatCurrency(totalAprovado)}</dd>
          </div>
          {cliente.tipo === 'cnpj' && cliente.nomeFantasia ? (
            <div>
              <dt>Nome fantasia</dt>
              <dd>{cliente.nomeFantasia}</dd>
            </div>
          ) : null}
          {cliente.telefoneAlternativo ? (
            <div>
              <dt>Telefone alternativo</dt>
              <dd>{cliente.telefoneAlternativo}</dd>
            </div>
          ) : null}
          {cliente.referenciaAcesso ? (
            <div>
              <dt>Referencia de acesso</dt>
              <dd>{cliente.referenciaAcesso}</dd>
            </div>
          ) : null}
          {cliente.observacoes ? (
            <div className="meta-grid-highlight">
              <dt>Observacoes</dt>
              <dd>{cliente.observacoes}</dd>
            </div>
          ) : null}
          {cliente.tags.length ? (
            <div className="meta-grid-highlight">
              <dt>Tags</dt>
              <dd>{cliente.tags.join(', ')}</dd>
            </div>
          ) : null}
        </div>
      </section>

      <section className="client-detail-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Representantes</h2>
              <p>Contatos usados quando o cliente e CNPJ.</p>
            </div>
          </div>
          {activeRepresentantes.length ? (
            <div className="representante-cards">
              {activeRepresentantes.map((representante) => (
                <article className="representante-card" key={representante.id}>
                  <UserRound size={18} />
                  <div>
                    <strong>{representante.nome}</strong>
                    <span>{representante.cargo}</span>
                    <span>{representante.telefone}</span>
                    {representante.email ? <span>{representante.email}</span> : null}
                    {representante.observacao ? <span>{representante.observacao}</span> : null}
                  </div>
                  {representante.principal ? <em>Principal</em> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">Cliente CPF ou sem representantes ativos.</div>
          )}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Linha do tempo</h2>
              <p>Acoes registradas no sistema.</p>
            </div>
          </div>
          <div className="timeline-list">
            {activity.length ? (
              activity.map((log) => (
                <article className="timeline-item" key={log.id}>
                  <FileClock size={16} />
                  <div>
                    <strong>{actionLabel(log.action)}</strong>
                    <span>{formatDateTimeBR(log.criadoEm)} · {log.actorName ?? 'Sistema'}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">Nenhuma atividade registrada ainda.</div>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Orcamentos do cliente</h2>
            <p>Historico comercial vinculado a ficha.</p>
          </div>
        </div>
        {orcamentos.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Data</th>
                  <th>Servico</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orcamentos.map((orcamento) => (
                  <tr key={orcamento.id}>
                    <td>
                      <Link className="inline-link" to={`/orcamentos/${orcamento.id}`}>
                        {formatOrcamentoNumero(orcamento.numero)}
                      </Link>
                    </td>
                    <td>{formatDateBR(orcamento.dataOrcamento)}</td>
                    <td>{orcamento.servicoCliente}</td>
                    <td>{formatCurrency(orcamento.total)}</td>
                    <td>
                      <StatusBadge status={orcamento.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">Nenhum orcamento vinculado a este cliente.</div>
        )}
      </section>

      <ConfirmDialog
        open={archiveOpen}
        title="Arquivar cliente?"
        description="A ficha ficara fora da visao de ativos, mas continuara vinculada ao historico."
        confirmLabel="Arquivar"
        onCancel={() => setArchiveOpen(false)}
        onConfirm={confirmArchive}
      />
    </section>
  )
}
