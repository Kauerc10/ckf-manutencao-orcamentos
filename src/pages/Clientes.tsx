import { Archive, Building2, FileText, Plus, Search, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatClienteDocumento, getClienteEndereco } from '../lib/clientes'
import { DEFAULT_CLIENTE_FILTERS, useClientes } from '../hooks/useClientes'
import type { ClienteFilters, ClienteTipo } from '../types'

const tipos: Array<ClienteTipo | 'todos'> = ['todos', 'cpf', 'cnpj']

export function Clientes() {
  const [filters, setFilters] = useState<ClienteFilters>(DEFAULT_CLIENTE_FILTERS)
  const { clientes, filtered, cityOptions, loading, error } = useClientes(filters)

  const stats = useMemo(
    () => [
      { label: 'Clientes ativos', value: clientes.filter((cliente) => cliente.ativo).length },
      { label: 'CNPJs', value: clientes.filter((cliente) => cliente.tipo === 'cnpj').length },
      { label: 'CPFs', value: clientes.filter((cliente) => cliente.tipo === 'cpf').length },
    ],
    [clientes],
  )

  return (
    <section className="page-stack">
      <div className="kpi-grid compact-kpis">
        {stats.map((stat) => (
          <article className="kpi-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Clientes</h2>
            <p>Base operacional para contatos, representantes e orçamentos vinculados.</p>
          </div>
          <Link className="primary-button" to="/clientes/novo">
            <Plus size={17} />
            Novo cliente
          </Link>
        </div>

        <div className="filters-bar client-filters">
          <label>
            Busca
            <span className="input-with-icon">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                placeholder="Nome, documento, representante ou tag"
              />
            </span>
          </label>
          <label>
            Tipo
            <select value={filters.tipo} onChange={(event) => setFilters({ ...filters, tipo: event.target.value as ClienteFilters['tipo'] })}>
              {tipos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo === 'todos' ? 'Todos' : tipo.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as ClienteFilters['status'] })}>
              <option value="ativos">Ativos</option>
              <option value="arquivados">Arquivados</option>
              <option value="todos">Todos</option>
            </select>
          </label>
          <label>
            Cidade/UF
            <select value={filters.cidadeUf} onChange={(event) => setFilters({ ...filters, cidadeUf: event.target.value })}>
              <option value="">Todas</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? <div className="skeleton-block">Carregando clientes...</div> : null}
        {error ? <div className="error-state">{error}</div> : null}
        {!loading && filtered.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhum cliente encontrado</strong>
            <span>Ajuste os filtros ou cadastre um novo cliente.</span>
          </div>
        ) : null}

        {!loading && filtered.length ? (
          <div className="client-list">
            {filtered.map((cliente) => {
              const Icon = cliente.tipo === 'cnpj' ? Building2 : UserRound
              const principal = cliente.representantes.find((representante) => representante.principal && representante.ativo)
              return (
                <article className="client-row" key={cliente.id}>
                  <div className="client-row-icon">
                    <Icon size={20} />
                  </div>
                  <div className="client-row-main">
                    <div className="client-row-title">
                      <strong>{cliente.nome}</strong>
                      {!cliente.ativo ? (
                        <span className="status-badge status-canceled">
                          <Archive size={12} />
                          Arquivado
                        </span>
                      ) : null}
                    </div>
                    <span>{formatClienteDocumento(cliente.documento)} · {cliente.telefonePrincipal}</span>
                    <span>{getClienteEndereco(cliente)}</span>
                    {principal ? <span>Representante: {principal.nome} · {principal.cargo}</span> : null}
                  </div>
                  <div className="client-row-actions">
                    <Link className="secondary-button" to={`/clientes/${cliente.id}`}>
                      <FileText size={16} />
                      Ficha
                    </Link>
                    <Link className="secondary-button" to={`/orcamentos/novo?clienteId=${cliente.id}`}>
                      <Plus size={16} />
                      Orçamento
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </section>
    </section>
  )
}
