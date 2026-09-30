import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { listServicos, listTabelas, saveTabela } from '../data/catalogoRepository'
import { useClientes } from '../hooks/useClientes'
import { formatCurrency, parseLocalizedNumber } from '../lib/formatters'
import { ajustarPreco, diferencaPreco } from '../lib/precos'
import { useAuthStore } from '../stores/authStore'
import type { Servico, Tabela, TabelaDraft } from '../types/comercial'
import { formatClienteDocumento } from '../lib/clientes'

function PriceEditor({
  servico,
  padrao,
  valor,
  disabled,
  onChange,
}: {
  servico: string
  padrao: number
  valor: number
  disabled: boolean
  onChange: (value: number) => void
}) {
  const [mode, setMode] = useState<'valor' | 'percentual'>('valor')
  const [raw, setRaw] = useState(String(valor))
  const parsed = parseLocalizedNumber(raw)
  const invalid = raw.trim() !== '' && (parsed === null || (mode === 'valor' ? parsed < 0 : parsed < -100))
  function apply() {
    if (parsed === null || invalid) {
      toast.error('Informe um valor válido para o ajuste.')
      return
    }
    try {
      const next = mode === 'valor' ? parsed : ajustarPreco(padrao, parsed)
      if (next < 0 || next > 9999999999.99) throw new Error('Preço inválido.')
      onChange(next)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Preço inválido.')
    }
  }
  function applyOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      apply()
    }
  }
  return (
    <div className="price-editor">
      <select
        aria-label={`Forma de ajuste de ${servico}`}
        value={mode}
        disabled={disabled}
        onChange={(event) => {
          setMode(event.target.value as typeof mode)
          setRaw(event.target.value === 'valor' ? String(valor) : '')
        }}
      >
        <option value="valor">Valor (R$)</option>
        <option value="percentual">% do padrão</option>
      </select>
      <input
        aria-label={`${mode === 'valor' ? 'Novo valor' : 'Percentual'} para ${servico}`}
        aria-invalid={invalid}
        inputMode="decimal"
        placeholder={mode === 'valor' ? '250,00' : '-10'}
        disabled={disabled}
        value={raw}
        onChange={(event) => setRaw(event.target.value)}
        onKeyDown={applyOnEnter}
      />
      <button type="button" className="secondary-button" disabled={disabled} onClick={apply}>
        Aplicar
      </button>
    </div>
  )
}

export function TabelaFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const admin = profile?.ativo && profile.role === 'admin'
  const { clientes, loading: loadingClientes, error: clientesError } = useClientes()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [tabelas, setTabelas] = useState<Tabela[]>([])
  const [draft, setDraft] = useState<TabelaDraft>({ empresaId: '', titulo: 'Tabela de serviços CKF', versao: 0, itens: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    void Promise.all([listServicos(), listTabelas()])
      .then(([available, existing]) => {
        if (!active) return
        setServicos(available)
        setTabelas(existing)
        if (id) {
          const found = existing.find((table) => table.id === id)
          if (!found) setError('Tabela não encontrada.')
          else
            setDraft({
              empresaId: found.empresa.id,
              titulo: found.titulo,
              versao: found.versao,
              itens: found.itens.map((item) => ({ servicoId: item.servicoId, preco: item.preco })),
            })
        }
        setLoading(false)
      })
      .catch(() => {
        if (active) {
          setError('Não foi possível carregar as tabelas e os serviços.')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [id])

  if (!admin) return <Navigate to="/tabelas" replace />
  if (loading || loadingClientes) return <div className="panel">Carregando tabela...</div>
  if (error || clientesError)
    return (
      <div className="panel" role="alert">
        <p>{error || clientesError}</p>
        <Link to="/tabelas">Voltar às tabelas</Link>
      </div>
    )

  const current = tabelas.find((table) => table.id === id)
  const availableCompanies = clientes.filter(
    (client) => client.tipo === 'cnpj' && client.ativo && !tabelas.some((table) => table.empresa.id === client.id),
  )
  const visible = servicos.filter(
    (service) =>
      (service.ativo || draft.itens.some((item) => item.servicoId === service.id)) &&
      `${service.codigo} ${service.nome} ${service.categoria}`.toLowerCase().includes(search.toLowerCase()),
  )

  if (!id && !availableCompanies.length)
    return (
      <section className="page-stack commercial-page">
        <div className="panel table-form-empty">
          <header className="service-editor-header">
            <h2>Nova tabela</h2>
            <Link className="secondary-button" to="/tabelas"><ArrowLeft size={16} />Voltar às tabelas</Link>
          </header>
          <p>Todas as empresas cadastradas já têm tabela, ou ainda não há empresas ativas.</p>
          <div className="commercial-actions">
            <Link className="primary-button" to="/clientes/novo">Cadastrar empresa</Link>
            <Link className="secondary-button" to="/tabelas">Consultar tabelas existentes</Link>
          </div>
        </div>
      </section>
    )

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!profile || saving) return
    if (!draft.empresaId || !draft.itens.length) {
      toast.error('Selecione uma empresa e ao menos um serviço.')
      return
    }
    setSaving(true)
    try {
      const saved = await saveTabela(draft, profile)
      toast.success(`Tabela salva. Versão ${saved.versao} disponível para consulta.`)
      navigate(`/tabelas?tabela=${saved.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a tabela.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page-stack commercial-page">
      <form className="panel commercial-form table-form" onSubmit={submit}>
        <header className="service-editor-header">
          <h2>{id ? 'Editar tabela' : 'Nova tabela'}</h2>
          <Link className="secondary-button" to={current ? `/tabelas?tabela=${current.id}` : '/tabelas'}>
            <ArrowLeft size={16} />
            Voltar às tabelas
          </Link>
        </header>
        <div className="commercial-fields">
          {id ? (
            <p className="table-form-company">
              <span>Empresa</span>
              <strong>{current?.empresa.nome}</strong>
              <small>{formatClienteDocumento(current?.empresa.documento ?? '')}</small>
              <small>Versão atual {current?.versao}</small>
            </p>
          ) : (
            <label>
              Empresa
              <select required value={draft.empresaId} onChange={(event) => setDraft({ ...draft, empresaId: event.target.value })}>
                <option value="">Selecione uma empresa</option>
                {availableCompanies.map((client) => (
                  <option key={client.id} value={client.id}>{client.nome} · {formatClienteDocumento(client.documento)}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            Título da tabela
            <input required maxLength={200} placeholder="Ex.: Tabela de manutenção CKF" value={draft.titulo} onChange={(event) => setDraft({ ...draft, titulo: event.target.value })} />
          </label>
        </div>
        <div className="table-form-toolbar">
          <label>
            Buscar serviço
            <input value={search} placeholder="Código, nome ou categoria" onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>
        <p className="form-note">Em “% do padrão”, use −10 para reduzir 10% ou +10 para aumentar 10%. Aplique e confira o preço final.</p>
        {!servicos.length ? (
          <p>Cadastre serviços no <Link to="/catalogo">catálogo</Link> antes de criar uma tabela.</p>
        ) : !visible.length ? (
          <p>Nenhum serviço encontrado para esta busca.</p>
        ) : (
          <div className="commercial-table-wrap table-form-list">
            <table className="commercial-table">
              <thead>
                <tr>
                  <th>Incluir</th>
                  <th>Serviço</th>
                  <th>Padrão</th>
                  <th>Ajuste</th>
                  <th>Preço da empresa</th>
                  <th>Diferença interna</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((service) => {
                  const item = draft.itens.find((entry) => entry.servicoId === service.id)
                  const diff = diferencaPreco(service.precoPadrao, item?.preco ?? service.precoPadrao)
                  return (
                    <tr key={service.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Incluir ${service.nome}`}
                          checked={!!item}
                          disabled={saving}
                          onChange={(event) => setDraft({
                            ...draft,
                            itens: event.target.checked
                              ? [...draft.itens, { servicoId: service.id, preco: service.precoPadrao }]
                              : draft.itens.filter((entry) => entry.servicoId !== service.id),
                          })}
                        />
                      </td>
                      <td>
                        <small>{service.codigo} · {service.categoria}{!service.ativo ? ' · Arquivado' : ''}</small>
                        <strong>{current?.itens.find((entry) => entry.servicoId === service.id)?.nome ?? service.nome}</strong>
                        <small>{service.unidade}</small>
                      </td>
                      <td className="money-cell">{formatCurrency(service.precoPadrao)}</td>
                      <td>
                        <PriceEditor
                          key={`${service.id}-${!!item}`}
                          servico={service.nome}
                          padrao={service.precoPadrao}
                          valor={item?.preco ?? service.precoPadrao}
                          disabled={!item || saving}
                          onChange={(preco) => setDraft({
                            ...draft,
                            itens: draft.itens.map((entry) => entry.servicoId === service.id ? { ...entry, preco } : entry),
                          })}
                        />
                      </td>
                      <td className="money-cell">{item ? formatCurrency(item.preco) : '—'}</td>
                      <td className="money-cell">
                        {item ? <>{diff.reais > 0 ? '+' : ''}{formatCurrency(diff.reais)}<small>{diff.percentual === null ? '% não aplicável' : `${diff.percentual > 0 ? '+' : ''}${diff.percentual.toLocaleString('pt-BR')}%`}</small></> : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="form-footer">
          <span className="form-note">{draft.itens.length} {draft.itens.length === 1 ? 'serviço' : 'serviços'} na tabela</span>
          <button className="primary-button" disabled={saving || !draft.empresaId || !draft.itens.length}>
            <Save size={16} />
            {saving ? 'Salvando...' : id ? 'Salvar nova versão' : 'Salvar tabela'}
          </button>
        </div>
      </form>
    </section>
  )
}
