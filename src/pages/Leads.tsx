import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Save, RefreshCw, MessageSquare, ArrowLeft, FilePlus } from 'lucide-react'
import { toast } from 'sonner'
import { getTicket, listTickets, listLeadProfiles, updateTicket } from '../data/leadRepository'
import { useAuthStore } from '../stores/authStore'
import { useClientes } from '../hooks/useClientes'
import { formatDateTimeBR } from '../lib/formatters'
import { LEAD_STAGES, toLeadStage, type LeadStage, type SiteTicket } from '../types/leads'
import type { Profile } from '../types'
const label = (s: SiteTicket['status']) => LEAD_STAGES[toLeadStage(s)]
export function Leads() {
  const [all, setAll] = useState<SiteTicket[]>([])
  const [profiles, setProfiles] = useState<Pick<Profile, 'id' | 'nome'>[]>([])
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')
  const [owner, setOwner] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([listTickets(), listLeadProfiles()])
      setAll(t)
      setProfiles(p)
      setError('')
    } catch {
      setError('Não foi possível carregar as solicitações. Confira as migrações e o acesso interno.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate repository data on mount
    void reload()
  }, [reload])
  const visible = all.filter(
    (t) =>
      (!stage || toLeadStage(t.status) === stage) &&
      (!owner || (owner === 'none' ? !t.responsavel_id : t.responsavel_id === owner)) &&
      `${t.public_id} ${t.contact_name} ${t.company_name} ${t.phone}`.toLowerCase().includes(search.toLowerCase()),
  )
  return (
    <section className="page-stack commercial-page">
      <div className="panel commercial-heading">
        <div>
          <span className="eyebrow dark">Atendimento do site</span>
          <h2>Solicitações / leads</h2>
          <p>Do primeiro contato ao orçamento, com o contexto à mão.</p>
        </div>
        <button className="secondary-button" onClick={reload}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>
      <div className="panel">
        <div className="commercial-filters">
          <label>
            Buscar
            <input
              placeholder="Protocolo, contato, empresa ou telefone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            Etapa
            <select value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(LEAD_STAGES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Responsável
            <select value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="">Todos</option>
              <option value="none">Sem responsável</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <p>Carregando solicitações...</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : !visible.length ? (
          <div className="commercial-empty">
            <MessageSquare size={30} />
            <h3>Nenhuma solicitação encontrada</h3>
            <p>Os pedidos registrados no site aparecerão nesta fila.</p>
          </div>
        ) : (
          <div className="commercial-table-wrap">
            <table className="commercial-table">
              <thead>
                <tr>
                  <th>Protocolo / recebido</th>
                  <th>Contato / empresa</th>
                  <th>Serviço / urgência</th>
                  <th>Etapa</th>
                  <th>Responsável</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.public_id}</strong>
                      <small>{formatDateTimeBR(t.created_at)}</small>
                    </td>
                    <td>
                      <strong>{t.contact_name}</strong>
                      <small>{t.company_name || t.phone}</small>
                    </td>
                    <td>
                      {t.service_name}
                      <small>{t.urgency}</small>
                    </td>
                    <td>
                      <span className={`lead-status lead-status-${t.status}`}>{label(t.status)}</span>
                    </td>
                    <td>
                      {profiles.find((p) => p.id === t.responsavel_id)?.nome ??
                        (t.responsavel_id ? 'Responsável inativo' : 'Sem responsável')}
                    </td>
                    <td>
                      <Link className="secondary-button" to={`/leads/${t.id}`}>
                        Atender
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
export function LeadDetalhe() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const profile = useAuthStore((s) => s.profile)
  const { clientes } = useClientes()
  const [ticket, setTicket] = useState<SiteTicket | null>(null)
  const [profiles, setProfiles] = useState<Pick<Profile, 'id' | 'nome'>[]>([])
  const [stage, setStage] = useState<LeadStage>('new')
  const [owner, setOwner] = useState('')
  const [note, setNote] = useState('')
  const [clienteId, setClienteId] = useState(params.get('clienteId') ?? '')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    if (!id) return
    try {
      const [t, p] = await Promise.all([getTicket(id), listLeadProfiles()])
      setTicket(t)
      setProfiles(p)
      if (t) {
        setStage(toLeadStage(t.status))
        setOwner(t.responsavel_id ?? '')
      }
      setError(t ? '' : 'Solicitação não encontrada.')
    } catch {
      setError('Não foi possível carregar esta solicitação.')
    } finally {
      setLoading(false)
    }
  }, [id])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the selected request from its repository
    void reload()
  }, [reload])
  async function save() {
    if (!id || !ticket || !profile) return
    setSaving(true)
    try {
      await updateTicket(id, ticket.versao, stage, owner || null, note, profile)
      setNote('')
      await reload()
      toast.success('Atendimento atualizado.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar.')
    } finally {
      setSaving(false)
    }
  }
  if (loading) return <div className="panel">Carregando solicitação...</div>
  if (error || !ticket)
    return (
      <div className="panel" role="alert">
        <p>{error}</p>
        <button className="secondary-button" onClick={reload}>
          Tentar novamente
        </button>
        <Link to="/leads">Voltar à fila</Link>
      </div>
    )
  return (
    <section className="page-stack commercial-page">
      <div className="panel commercial-heading">
        <div>
          <span className="eyebrow dark">Protocolo {ticket.public_id}</span>
          <h2>{ticket.contact_name}</h2>
          <p>
            {ticket.company_name || 'Solicitação de atendimento'} · {formatDateTimeBR(ticket.created_at)}
          </p>
        </div>
        <Link className="secondary-button" to="/leads">
          <ArrowLeft size={16} />
          Fila de solicitações
        </Link>
      </div>
      <div className="lead-detail-grid">
        <div className="page-stack">
          <div className="panel">
            <h3>{ticket.service_name}</h3>
            <p className="lead-description">{ticket.description}</p>
            <dl className="lead-facts">
              <dt>Urgência</dt>
              <dd>{ticket.urgency}</dd>
              <dt>Equipamento</dt>
              <dd>
                {[ticket.equipment_type, ticket.equipment_brand, ticket.equipment_model].filter(Boolean).join(' · ') ||
                  'Não informado'}
              </dd>
              <dt>Local</dt>
              <dd>{[ticket.city, ticket.uf].filter(Boolean).join(' / ') || 'Não informado'}</dd>
              <dt>Telefone</dt>
              <dd>{ticket.phone}</dd>
              <dt>Email</dt>
              <dd>{ticket.email || 'Não informado'}</dd>
            </dl>
            <a className="secondary-button" href={`https://wa.me/${ticket.phone}`} target="_blank" rel="noreferrer">
              <MessageSquare size={16} />
              Abrir WhatsApp
            </a>
            <details className="lead-origin">
              <summary>Origem da solicitação</summary>
              <p>
                Página: {ticket.landing_path || '—'}
                <br />
                Ponto de contato: {ticket.cta_source || '—'}
                <br />
                Campanha: {[ticket.utm_source, ticket.utm_campaign].filter(Boolean).join(' / ') || '—'}
              </p>
            </details>
          </div>
          <div className="panel commercial-form">
            <h3>Continuar com orçamento</h3>
            {ticket.converted_orcamento_id ? (
              <>
                <p>Esta solicitação já tem um orçamento vinculado.</p>
                <Link className="secondary-button" to={`/orcamentos/${ticket.converted_orcamento_id}`}>
                  Abrir orçamento
                </Link>
              </>
            ) : (
              <>
                <p>
                  Selecione um cliente ou complete seu cadastro com os dados da solicitação. Os preços serão preenchidos
                  manualmente.
                </p>
                <label>
                  Cliente
                  <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                    <option value="">Selecione</option>
                    {clientes
                      .filter((c) => c.ativo)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} · {c.documento}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="commercial-actions">
                  <Link className="secondary-button" to={`/leads/${ticket.id}/cliente`}>
                    Cadastrar cliente com estes dados
                  </Link>
                  {clienteId && (
                    <Link className="primary-button" to={`/orcamentos/novo?leadId=${ticket.id}&clienteId=${clienteId}`}>
                      <FilePlus size={16} />
                      Preparar orçamento
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="page-stack">
          <div className="panel commercial-form">
            <h3>Acompanhar atendimento</h3>
            <label>
              Etapa
              <select value={stage} disabled={saving} onChange={(e) => setStage(e.target.value as LeadStage)}>
                {Object.entries(LEAD_STAGES).map(([k, v]) => (
                  <option key={k} value={k} disabled={k === 'budget_created' && !ticket.converted_orcamento_id}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Responsável (opcional)
              <select value={owner} disabled={saving} onChange={(e) => setOwner(e.target.value)}>
                <option value="">Sem responsável</option>
                {owner && !profiles.some((p) => p.id === owner) && (
                  <option value={owner}>Responsável inativo — selecione outro</option>
                )}
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nova observação
              <textarea
                rows={4}
                maxLength={2000}
                value={note}
                disabled={saving}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button className="primary-button" disabled={saving} onClick={save}>
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar atendimento'}
            </button>
            <button className="secondary-button" disabled={saving} onClick={reload}>
              Recarregar dados
            </button>
          </div>
          <div className="panel">
            <h3>Histórico</h3>
            {!ticket.site_ticket_events.length ? (
              <p className="form-note">Nenhuma atualização registrada.</p>
            ) : (
              <ol className="lead-timeline">
                {[...ticket.site_ticket_events]
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .map((e) => (
                    <li key={e.id}>
                      <strong>{e.actor_name}</strong>
                      <small>{formatDateTimeBR(e.created_at)}</small>
                      {e.details.status && <p>Etapa: {label(e.details.status as SiteTicket['status'])}</p>}
                      {e.details.responsavel_nome && <p>Responsável: {e.details.responsavel_nome}</p>}
                      {e.details.observacao && <p className="lead-description">{e.details.observacao}</p>}
                    </li>
                  ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
